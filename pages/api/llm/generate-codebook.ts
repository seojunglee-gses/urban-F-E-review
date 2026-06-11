import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

import { buildMockCodebook } from "../../../src/lib/mock/mockLiterature";
import {
  apiErrorResponseSchema,
  generateCodebookRequestSchema,
  generatedCodebookApiResponseSchema,
  generatedCodebookSchema,
} from "../../../src/lib/schemas/literatureSchemas";
import type {
  ApiErrorResponse,
  GeneratedCodebook,
} from "../../../src/types/literature";

const sendError = (
  response: NextApiResponse<ApiErrorResponse>,
  status: number,
  error: ApiErrorResponse,
): void => {
  response.status(status).json(apiErrorResponseSchema.parse(error));
};

const extractJson = (content: string): unknown => {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as unknown;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start)
    return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  throw new Error("LLM response did not contain a JSON object.");
};

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<
    { codebook: GeneratedCodebook; warnings: string[] } | ApiErrorResponse
  >,
): Promise<void> {
  if (request.method !== "POST") {
    sendError(response, 405, {
      error: "Unsupported method",
      code: "invalid-request",
      actionableMessage: "Use POST to generate a draft codebook.",
    });
    return;
  }

  const parsed = generateCodebookRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, {
      error: "Invalid codebook-generation payload",
      code: "invalid-request",
      actionableMessage: parsed.error.issues
        .map((issue) => issue.message)
        .join("; "),
    });
    return;
  }

  const mockMode =
    process.env.MOCK_LLM === "true" && process.env.NODE_ENV !== "production";
  if (mockMode) {
    const codebook = buildMockCodebook(
      parsed.data.topicModel,
      parsed.data.records.length,
    );
    response.status(200).json(
      generatedCodebookApiResponseSchema.parse({
        codebook,
        warnings: codebook.warnings,
      }),
    );
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    sendError(response, 200, {
      error: "Missing OPENAI_API_KEY",
      code: "missing-api-key",
      actionableMessage:
        "Add OPENAI_API_KEY or set MOCK_LLM=true for deterministic development output.",
    });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const sampleAbstracts = parsed.data.records.slice(0, 24).map((record) => ({
      id: record.id,
      title: record.title,
      keywords: record.keywords,
      abstract: record.abstract.slice(0, 900),
    }));
    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Generate a corpus-derived draft codebook for an urban form and energy systematic review. Return strict JSON only matching {id,createdAt,sourceRecordCount,dimensions:[{id,name,description,categories:[{id,label,definition,inclusionCriteria,exclusionCriteria,examples,relatedTopicIds}]}],notes,warnings}. Include dimensions: Urban form variable, Energy outcome, Mechanism, Relationship type, Planning implication, Spatial scale, Methodology, Geography/context, Sector. Categories must be derived from topics and abstracts; a seed ontology may guide but not replace corpus-derived categories.",
        },
        {
          role: "user",
          content: `Topic clusters: ${JSON.stringify(parsed.data.topicModel.clusters)}\nSample abstracts: ${JSON.stringify(sampleAbstracts)}`,
        },
      ],
    });
    const codebook = generatedCodebookSchema.parse(
      extractJson(completion.choices[0]?.message.content ?? ""),
    );
    response.status(200).json(
      generatedCodebookApiResponseSchema.parse({
        codebook,
        warnings: codebook.warnings,
      }),
    );
  } catch (error) {
    sendError(response, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Unable to parse LLM codebook output",
      code: "llm-json-parse",
      actionableMessage:
        "Retry, enable MOCK_LLM=true, or simplify the topic model payload.",
    });
  }
}

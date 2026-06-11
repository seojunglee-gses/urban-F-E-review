import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

import { buildMockTopicModel } from "../../../src/lib/mock/mockLiterature";
import {
  apiErrorResponseSchema,
  topicModelApiResponseSchema,
  topicModelRequestSchema,
  topicModelResultSchema,
} from "../../../src/lib/schemas/literatureSchemas";
import type {
  ApiErrorResponse,
  TopicModelResult,
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
    { topicModel: TopicModelResult; warnings: string[] } | ApiErrorResponse
  >,
): Promise<void> {
  if (request.method !== "POST") {
    sendError(response, 405, {
      error: "Unsupported method",
      code: "invalid-request",
      actionableMessage: "Use POST to run topic modeling.",
    });
    return;
  }

  const parsed = topicModelRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, {
      error: "Invalid topic-modeling payload",
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
    const topicModel = buildMockTopicModel(parsed.data.records);
    response.status(200).json(
      topicModelApiResponseSchema.parse({
        topicModel,
        warnings: topicModel.warnings,
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

  const records = parsed.data.records.filter(
    (record) => record.screeningStatus !== "excluded",
  );
  if (records.every((record) => record.abstract.length < 80)) {
    sendError(response, 200, {
      error: "Missing abstracts",
      code: "missing-abstracts",
      actionableMessage:
        "Retrieve records with abstracts before running topic modeling.",
    });
    return;
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const compactRecords = records.slice(0, 80).map((record) => ({
      id: record.id,
      title: record.title,
      year: record.year,
      keywords: record.keywords,
      abstract: record.abstract.slice(0, 1600),
    }));
    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'You are a research software assistant for systematic literature reviews. Discover topic clusters from abstracts. Return strict JSON only matching: {"id":string,"createdAt":string,"sourceRecordCount":number,"clusters":[{"id":string,"label":string,"description":string,"keywords":string[],"representativeRecordIds":string[],"urbanFormSignals":string[],"energyOutcomeSignals":string[],"mechanismSignals":string[],"confidence":number}],"warnings":string[],"mockMode":false}. Discover topics; do not simply force fixed labels.',
        },
        {
          role: "user",
          content: `Identify topic clusters for urban form and energy abstracts. Candidate examples include morphology/building energy, UHI/cooling, density/transport tradeoffs, LCZ/3D/canyon geometry, green infrastructure, simulations and empirical utility studies. Records: ${JSON.stringify(compactRecords)}`,
        },
      ],
    });
    const content = completion.choices[0]?.message.content ?? "";
    const topicModel = topicModelResultSchema.parse(extractJson(content));
    response.status(200).json(
      topicModelApiResponseSchema.parse({
        topicModel,
        warnings: topicModel.warnings,
      }),
    );
  } catch (error) {
    sendError(response, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Unable to parse LLM topic model output",
      code: "llm-json-parse",
      actionableMessage:
        "Retry with fewer records, enable MOCK_LLM=true, or inspect the raw model response in server logs.",
    });
  }
}

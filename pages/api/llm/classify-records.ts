import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

import { buildMockClassifications } from "../../../src/lib/mock/mockLiterature";
import {
  apiErrorResponseSchema,
  classifyRecordsApiResponseSchema,
  classifyRecordsRequestSchema,
  llmClassificationSchema,
} from "../../../src/lib/schemas/literatureSchemas";
import type {
  ApiErrorResponse,
  LLMClassification,
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
  if (trimmed.startsWith("{") || trimmed.startsWith("["))
    return JSON.parse(trimmed) as unknown;
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart)
    return JSON.parse(trimmed.slice(objectStart, objectEnd + 1)) as unknown;
  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart)
    return JSON.parse(trimmed.slice(arrayStart, arrayEnd + 1)) as unknown;
  throw new Error("LLM response did not contain JSON.");
};

const chunkRecords = <T>(records: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let index = 0; index < records.length; index += size) {
    chunks.push(records.slice(index, index + size));
  }
  return chunks;
};

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<
    | {
        classifications: LLMClassification[];
        warnings: string[];
        mockMode: boolean;
      }
    | ApiErrorResponse
  >,
): Promise<void> {
  if (request.method !== "POST") {
    sendError(response, 405, {
      error: "Unsupported method",
      code: "invalid-request",
      actionableMessage: "Use POST to classify abstracts.",
    });
    return;
  }

  const parsed = classifyRecordsRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    sendError(response, 400, {
      error: "Invalid classification payload",
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
    const classifications = buildMockClassifications(parsed.data.records);
    const warnings = classifications.some(
      (classification) => classification.confidence < 0.6,
    )
      ? [
          "Some mock classifications are low confidence because abstracts are short.",
        ]
      : [];
    response.status(200).json(
      classifyRecordsApiResponseSchema.parse({
        classifications,
        warnings,
        mockMode: true,
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
    const classifications: LLMClassification[] = [];
    for (const chunk of chunkRecords(parsed.data.records, 12)) {
      const compactRecords = chunk.map((record) => ({
        id: record.id,
        title: record.title,
        abstract: record.abstract.slice(0, 1300),
        keywords: record.keywords,
        candidateLocations: record.candidateLocations,
      }));
      const completion = await openai.chat.completions.create({
        model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Classify abstracts using the generated codebook. Return JSON object {"classifications":[...]} only. Each classification must include recordId, urbanFormVariables, energyOutcomes, relationshipType, mechanisms, planningImplications, scale, methodology, geography, climateContext, sector, confidence, evidenceQuote, uncertaintyNotes. Use relationship enum positive, negative, mixed, nonlinear, context-dependent, no-clear-relationship, not-applicable; scale enum building, block, neighborhood, city, metropolitan, regional, multi-scalar, unclear; methodology enum simulation, empirical-observational, statistical-modeling, machine-learning, remote-sensing-gis, review, conceptual, mixed-methods, unclear; sector enum building-heating, building-cooling, building-electricity, transport-energy, total-urban-energy, emissions, microclimate-mediated-energy, unclear. Include an evidence quote from the abstract and lower confidence for ambiguous cases.',
          },
          {
            role: "user",
            content: `Generated codebook: ${JSON.stringify(parsed.data.codebook.dimensions)}\nRecords: ${JSON.stringify(compactRecords)}`,
          },
        ],
      });
      const parsedJson = extractJson(
        completion.choices[0]?.message.content ?? "",
      );
      const record =
        typeof parsedJson === "object" && parsedJson !== null
          ? (parsedJson as { classifications?: unknown })
          : {};
      const chunkClassifications = Array.isArray(record.classifications)
        ? record.classifications
        : parsedJson;
      const validated = llmClassificationSchema
        .array()
        .parse(chunkClassifications);
      classifications.push(...validated);
    }
    const warnings = classifications.some(
      (classification) => classification.confidence < 0.6,
    )
      ? [
          "Some records are low confidence and should be manually reviewed later.",
        ]
      : [];
    response.status(200).json(
      classifyRecordsApiResponseSchema.parse({
        classifications,
        warnings,
        mockMode: false,
      }),
    );
  } catch (error) {
    sendError(response, 500, {
      error:
        error instanceof Error
          ? error.message
          : "Unable to parse LLM classification output",
      code: "llm-json-parse",
      actionableMessage:
        "Retry with fewer records, enable MOCK_LLM=true, or inspect the raw model response in server logs.",
    });
  }
}

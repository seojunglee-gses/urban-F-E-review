import OpenAI from "openai";

import { buildFallbackCodebook } from "./codebook";
import { codePaperDeterministically } from "./paper-coding";
import type { CodedPaper, Paper, ReviewCodebook } from "../types/review";

const extractJsonObject = (content: string): unknown => {
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as unknown;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  throw new Error("Model response did not contain JSON.");
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asStringArray = (value: unknown): string[] => (Array.isArray(value) ? value.map(String).filter(Boolean) : []);

export const normalizeCodebook = (value: unknown, researchQuestion: string): ReviewCodebook => {
  const record = asRecord(value);
  const variables = Array.isArray(record.variables) ? record.variables.map(asRecord) : [];
  return {
    researchQuestion: String(record.researchQuestion ?? researchQuestion),
    inclusionCriteria: asStringArray(record.inclusionCriteria),
    exclusionCriteria: asStringArray(record.exclusionCriteria),
    variables: variables.map((variable) => ({
      name: String(variable.name ?? "unnamed variable"),
      definition: String(variable.definition ?? ""),
      type: ["categorical", "numeric", "text", "boolean"].includes(String(variable.type)) ? (String(variable.type) as "categorical" | "numeric" | "text" | "boolean") : "text",
      allowedValues: asStringArray(variable.allowedValues),
      extractionRule: String(variable.extractionRule ?? "Use title and abstract only."),
      examples: asStringArray(variable.examples),
    })),
    extractionRules: asStringArray(record.extractionRules),
    codingInstructions: asStringArray(record.codingInstructions),
    qualityChecks: asStringArray(record.qualityChecks),
  };
};

export const generateCodebookWithLlm = async ({
  researchQuestion,
  keywords,
  samplePapers,
}: {
  researchQuestion: string;
  keywords: string[];
  samplePapers: Array<Pick<Paper, "title" | "abstract" | "year">>;
}): Promise<ReviewCodebook> => {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Return strict JSON for a systematic review codebook with researchQuestion, inclusionCriteria, exclusionCriteria, variables, extractionRules, codingInstructions, qualityChecks. Variables must support urban form and energy evidence mapping.",
      },
      {
        role: "user",
        content: JSON.stringify({ researchQuestion, keywords, samplePapers }),
      },
    ],
  });
  const parsed = extractJsonObject(completion.choices[0]?.message.content ?? "");
  const codebook = normalizeCodebook(parsed, researchQuestion);
  return codebook.variables.length > 0 ? codebook : buildFallbackCodebook(researchQuestion);
};

export const codePaperWithLlm = async (paper: Paper, codebook: ReviewCodebook): Promise<CodedPaper> => {
  if (!process.env.OPENAI_API_KEY || !paper.abstract) return codePaperDeterministically(paper, codebook);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Code one paper using the codebook. Return JSON with paperId, include, exclusionReason, codes {urbanFormVariables, energyOutcomes, method, spatialScale, climateContext, studyLocation, country, buildingType, keyFinding, evidenceStrength}, confidence, needsManualReview. Use unclear for missing details and do not hallucinate.",
      },
      { role: "user", content: JSON.stringify({ paper, codebook }) },
    ],
  });
  const parsed = asRecord(extractJsonObject(completion.choices[0]?.message.content ?? ""));
  const codes = asRecord(parsed.codes);
  const confidence = Number(parsed.confidence ?? 0.5);
  return {
    paperId: String(parsed.paperId ?? paper.id),
    include: Boolean(parsed.include),
    exclusionReason: typeof parsed.exclusionReason === "string" ? parsed.exclusionReason : null,
    codes: {
      urbanFormVariables: asStringArray(codes.urbanFormVariables),
      energyOutcomes: asStringArray(codes.energyOutcomes),
      method: String(codes.method ?? "unclear"),
      spatialScale: String(codes.spatialScale ?? "unclear"),
      climateContext: String(codes.climateContext ?? "unclear"),
      studyLocation: String(codes.studyLocation ?? "unclear"),
      country: String(codes.country ?? paper.countries[0] ?? "unclear"),
      buildingType: String(codes.buildingType ?? "unclear"),
      keyFinding: String(codes.keyFinding ?? "unclear"),
      evidenceStrength: ["low", "medium", "high", "unclear"].includes(String(codes.evidenceStrength)) ? (String(codes.evidenceStrength) as "low" | "medium" | "high" | "unclear") : "unclear",
    },
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
    needsManualReview: Boolean(parsed.needsManualReview) || confidence < 0.6,
  };
};

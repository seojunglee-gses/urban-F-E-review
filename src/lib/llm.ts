import OpenAI from "openai";

import { buildFallbackCodebook } from "./codebook";
import { codePaperDeterministically } from "./paper-coding";
import type { CodedPaper, CodebookVariable, Paper, ReviewCodebook } from "../types/review";

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

const incomeGroupVariable: CodebookVariable = {
  name: "income group",
  definition: "World Bank income group for the extracted study-area country.",
  type: "categorical",
  allowedValues: ["High income", "Upper middle income", "Lower middle income", "Low income", "Unknown"],
  extractionRule: "Do not ask the model to infer this value. The application assigns it from worldBankIncomeGroups.json after resolving the study-area country.",
  examples: ["High income", "Lower middle income"],
};

export const normalizeCodebook = (value: unknown, researchQuestion: string): ReviewCodebook => {
  const record = asRecord(value);
  const variables = Array.isArray(record.variables) ? record.variables.map(asRecord) : [];
  const normalizedVariables = variables.map((variable) => ({
    name: String(variable.name ?? "unnamed variable"),
    definition: String(variable.definition ?? ""),
    type: ["categorical", "numeric", "text", "boolean"].includes(String(variable.type)) ? (String(variable.type) as "categorical" | "numeric" | "text" | "boolean") : "text",
    allowedValues: asStringArray(variable.allowedValues),
    extractionRule: String(variable.extractionRule ?? "Use title and abstract only."),
    examples: asStringArray(variable.examples),
  }));
  if (!normalizedVariables.some((variable) => variable.name.toLowerCase().includes("income group"))) {
    normalizedVariables.push(incomeGroupVariable);
  }
  return {
    researchQuestion: String(record.researchQuestion ?? researchQuestion),
    inclusionCriteria: asStringArray(record.inclusionCriteria),
    exclusionCriteria: asStringArray(record.exclusionCriteria),
    variables: normalizedVariables,
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
          "Return strict JSON for a systematic review codebook with researchQuestion, inclusionCriteria, exclusionCriteria, variables, extractionRules, codingInstructions, qualityChecks. Variables must support urban form and energy evidence mapping, including study-area city, country, and income group. For location extraction, instruct coders to output city and country names in English, use reference-style place names when clear, include normalizedPlaceName as \"City, Country\" when possible, never generate latitude/longitude, and never force vague regions, metropolitan areas, or ambiguous places into a city. Income group must be populated by the application lookup, not guessed by the model.",
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
          "Code one paper using the codebook. Return JSON with paperId, include, exclusionReason, codes {urbanFormVariables, energyOutcomes, method, spatialScale, climateContext, studyLocation, country, buildingType, keyFinding, evidenceStrength}, confidence, needsManualReview. Use unclear for missing details and do not hallucinate. For geography, use only study-area evidence in title/abstract; ignore author affiliations, institutions, publisher locations, and OpenAlex metadata countries. Output city and country names in English and use the closest reference-style city/country names when the study area clearly corresponds to a city. Use normalizedPlaceName in \"City, Country\" form when possible. Do not generate latitude or longitude, and do not force regions, metropolitan areas, vague places, or ambiguous locations into a city. Do not guess income group; it is assigned only by application lookup from the study-area country.",
      },
      { role: "user", content: JSON.stringify({ paper: { id: paper.id, title: paper.title, abstract: paper.abstract, year: paper.year, concepts: paper.concepts, geoMention: paper.geoMention }, codebook }) },
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
      climateContext: paper.geoMention?.climateZone ?? String(codes.climateContext ?? "unclear"),
      studyLocation: String(codes.studyLocation ?? "unclear"),
      country: String(codes.country ?? paper.geoMention?.country ?? "unclear"),
      buildingType: String(codes.buildingType ?? "unclear"),
      keyFinding: String(codes.keyFinding ?? "unclear"),
      evidenceStrength: ["low", "medium", "high", "unclear"].includes(String(codes.evidenceStrength)) ? (String(codes.evidenceStrength) as "low" | "medium" | "high" | "unclear") : "unclear",
    },
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
    needsManualReview: Boolean(parsed.needsManualReview) || confidence < 0.6,
  };
};

import { z } from "zod";

import { MAX_WOS_COUNT, MAX_YEAR, MIN_YEAR } from "../config/searchConfig";

export const relationshipTypeSchema = z.enum([
  "positive",
  "negative",
  "mixed",
  "nonlinear",
  "context-dependent",
  "no-clear-relationship",
  "not-applicable",
]);

export const spatialScaleSchema = z.enum([
  "building",
  "block",
  "neighborhood",
  "city",
  "metropolitan",
  "regional",
  "multi-scalar",
  "unclear",
]);

export const methodologySchema = z.enum([
  "simulation",
  "empirical-observational",
  "statistical-modeling",
  "machine-learning",
  "remote-sensing-gis",
  "review",
  "conceptual",
  "mixed-methods",
  "unclear",
]);

export const sectorSchema = z.enum([
  "building-heating",
  "building-cooling",
  "building-electricity",
  "transport-energy",
  "total-urban-energy",
  "emissions",
  "microclimate-mediated-energy",
  "unclear",
]);

export const apiErrorResponseSchema = z.object({
  error: z.string(),
  code: z.enum([
    "missing-api-key",
    "invalid-request",
    "rate-limited",
    "no-records",
    "missing-abstracts",
    "llm-json-parse",
    "network-error",
    "server-error",
  ]),
  actionableMessage: z.string(),
  warnings: z.array(z.string()).optional(),
});

export const wosSearchRequestSchema = z
  .object({
    query: z.string().min(8).optional(),
    yearStart: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional(),
    yearEnd: z.number().int().min(MIN_YEAR).max(MAX_YEAR).optional(),
    count: z.number().int().min(1).max(MAX_WOS_COUNT).optional(),
    firstRecord: z.number().int().min(1).optional(),
  })
  .refine(
    (value) =>
      value.yearStart === undefined ||
      value.yearEnd === undefined ||
      value.yearStart <= value.yearEnd,
    "yearStart must be before or equal to yearEnd",
  );

export const bibliographicRecordSchema = z.object({
  id: z.string(),
  uid: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  journal: z.string(),
  doi: z.string(),
  abstract: z.string(),
  authorKeywords: z.array(z.string()),
  keywordsPlus: z.array(z.string()),
  sourceDatabase: z.string(),
  documentType: z.string(),
  timesCited: z.number().int().nullable(),
  affiliations: z.array(z.string()),
  countries: z.array(z.string()),
  raw: z.record(z.unknown()),
});

export const normalizedAbstractRecordSchema = z.object({
  id: z.string(),
  title: z.string(),
  abstract: z.string(),
  year: z.number().int().nullable(),
  doi: z.string(),
  authors: z.array(z.string()),
  journal: z.string(),
  keywords: z.array(z.string()),
  candidateLocations: z.array(z.string()),
  normalizedText: z.string(),
  screeningStatus: z.enum(["included", "excluded", "uncertain"]),
  exclusionReason: z.string().optional(),
});

export const topicClusterSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  representativeRecordIds: z.array(z.string()),
  urbanFormSignals: z.array(z.string()),
  energyOutcomeSignals: z.array(z.string()),
  mechanismSignals: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const topicModelResultSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  sourceRecordCount: z.number().int().nonnegative(),
  clusters: z.array(topicClusterSchema),
  warnings: z.array(z.string()),
  mockMode: z.boolean(),
});

export const codebookCategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  definition: z.string(),
  inclusionCriteria: z.array(z.string()),
  exclusionCriteria: z.array(z.string()),
  examples: z.array(z.string()),
  relatedTopicIds: z.array(z.string()),
});

export const codebookDimensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  categories: z.array(codebookCategorySchema),
});

export const generatedCodebookSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  sourceRecordCount: z.number().int().nonnegative(),
  dimensions: z.array(codebookDimensionSchema),
  notes: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const llmClassificationSchema = z.object({
  recordId: z.string(),
  urbanFormVariables: z.array(z.string()),
  energyOutcomes: z.array(z.string()),
  relationshipType: relationshipTypeSchema,
  mechanisms: z.array(z.string()),
  planningImplications: z.array(z.string()),
  scale: spatialScaleSchema,
  methodology: methodologySchema,
  geography: z.array(z.string()),
  climateContext: z.string(),
  sector: sectorSchema,
  confidence: z.number().min(0).max(1),
  evidenceQuote: z.string(),
  uncertaintyNotes: z.array(z.string()),
});

export const topicModelRequestSchema = z.object({
  records: z.array(normalizedAbstractRecordSchema).min(1),
});

export const generateCodebookRequestSchema = z.object({
  topicModel: topicModelResultSchema,
  records: z.array(normalizedAbstractRecordSchema).min(1),
});

export const classifyRecordsRequestSchema = z.object({
  records: z.array(normalizedAbstractRecordSchema).min(1),
  codebook: generatedCodebookSchema,
});

export const topicModelApiResponseSchema = z.object({
  topicModel: topicModelResultSchema,
  warnings: z.array(z.string()),
});

export const generatedCodebookApiResponseSchema = z.object({
  codebook: generatedCodebookSchema,
  warnings: z.array(z.string()),
});

export const classifyRecordsApiResponseSchema = z.object({
  classifications: z.array(llmClassificationSchema),
  warnings: z.array(z.string()),
  mockMode: z.boolean(),
});

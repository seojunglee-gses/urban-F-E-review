import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { codePaperWithLlm } from "../../../src/lib/llm";
import { codePaperDeterministically } from "../../../src/lib/paper-coding";
import type { CodedPaper, Paper, ReviewCodebook } from "../../../src/types/review";


const geoMentionSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  climateZone: z.string().optional(),
  localClimateZone: z.string().optional(),
  incomeGroup: z.enum(["Low income", "Lower middle income", "Upper middle income", "High income", "Unknown"]).optional(),
  confidence: z.number(),
  source: z.enum(["llm", "title", "abstract", "geocoder", "manual", "unknown"]),
  coordinateSource: z.enum(["geocoding_api", "map_library", "none"]),
  locationRole: z.enum(["study_area", "country_only", "region_only", "unknown"]),
  evidenceText: z.string().optional(),
});

const paperSchema = z.object({
  id: z.string(),
  openAlexId: z.string().default(""),
  title: z.string(),
  year: z.number().nullable(),
  doi: z.string().nullable(),
  journal: z.string().nullable(),
  authors: z.array(z.string()).default([]),
  countries: z.array(z.string()).default([]),
  institutions: z.array(z.string()).default([]),
  concepts: z.array(z.string()).default([]),
  abstract: z.string().nullable(),
  url: z.string().nullable(),
  citedByCount: z.number().optional(),
  source: z.enum(["openalex", "web-of-science"]),
  geoMention: geoMentionSchema.optional(),
});

const codebookSchema = z.object({
  researchQuestion: z.string(),
  inclusionCriteria: z.array(z.string()),
  exclusionCriteria: z.array(z.string()),
  variables: z.array(z.object({
    name: z.string(),
    definition: z.string(),
    type: z.enum(["categorical", "numeric", "text", "boolean"]),
    allowedValues: z.array(z.string()),
    extractionRule: z.string(),
    examples: z.array(z.string()),
  })),
  extractionRules: z.array(z.string()),
  codingInstructions: z.array(z.string()),
  qualityChecks: z.array(z.string()),
});

const requestSchema = z.object({ paper: paperSchema, codebook: codebookSchema });

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<CodedPaper | { error: string }>,
): Promise<void> {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Use POST to code a paper." });
    return;
  }

  const parsed = requestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") });
    return;
  }

  const paper = parsed.data.paper as Paper;
  const codebook = parsed.data.codebook as ReviewCodebook;
  if (!paper.abstract || !process.env.OPENAI_API_KEY) {
    response.status(200).json(codePaperDeterministically(paper, codebook));
    return;
  }

  try {
    response.status(200).json(await codePaperWithLlm(paper, codebook));
  } catch {
    response.status(200).json(codePaperDeterministically(paper, codebook));
  }
}

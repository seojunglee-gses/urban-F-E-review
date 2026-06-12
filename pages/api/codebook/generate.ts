import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { buildFallbackCodebook } from "../../../src/lib/codebook";
import { generateCodebookWithLlm } from "../../../src/lib/llm";
import type { ReviewCodebook } from "../../../src/types/review";

const samplePaperSchema = z.object({
  title: z.string(),
  abstract: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
});

const requestSchema = z.object({
  researchQuestion: z.string().min(1),
  keywords: z.array(z.string()).default([]),
  samplePapers: z.array(samplePaperSchema).default([]),
});

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse<{ codebook: ReviewCodebook; warnings: string[] } | { error: string }>,
): Promise<void> {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Use POST to generate a codebook." });
    return;
  }

  const parsed = requestSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join("; ") });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    response.status(200).json({
      codebook: buildFallbackCodebook(parsed.data.researchQuestion),
      warnings: ["OPENAI_API_KEY is missing. Returned fallback codebook."],
    });
    return;
  }

  try {
    const codebook = await generateCodebookWithLlm({
      researchQuestion: parsed.data.researchQuestion,
      keywords: parsed.data.keywords,
      samplePapers: parsed.data.samplePapers.map((paper) => ({
        title: paper.title,
        abstract: paper.abstract ?? null,
        year: paper.year ?? null,
      })),
    });
    response.status(200).json({ codebook, warnings: [] });
  } catch (error) {
    response.status(200).json({
      codebook: buildFallbackCodebook(parsed.data.researchQuestion),
      warnings: [error instanceof Error ? error.message : "Codebook generation failed; returned fallback codebook."],
    });
  }
}

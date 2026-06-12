import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { samplePapersForCodebook } from "../../../src/lib/codebook";
import { buildChartData, buildEvidenceSummary, buildGapMap } from "../../../src/lib/evidence-summary";
import { generateCodebookWithLlm, codePaperWithLlm } from "../../../src/lib/llm";
import { buildMapData } from "../../../src/lib/map-data";
import { searchOpenAlexWorks } from "../../../src/lib/openalex";
import { codePaperDeterministically } from "../../../src/lib/paper-coding";
import type { CodedPaper, Paper, ReviewCodebook, ReviewRunResponse, ReviewRunStatus } from "../../../src/types/review";

const reviewRunSchema = z.object({
  query: z.string().trim().min(2, "Enter a research topic or question."),
  researchQuestion: z.string().trim().optional(),
  maxResults: z.number().int().min(1).max(200).optional().default(50),
});

const defaultStatus = (): ReviewRunStatus => ({
  search: "skipped",
  codebook: "skipped",
  coding: "skipped",
  summary: "skipped",
});

const emptyResponse = ({ query, researchQuestion, status, errors }: { query: string; researchQuestion: string; status: ReviewRunStatus; errors: string[] }): ReviewRunResponse => ({
  query,
  researchQuestion,
  status,
  papers: [],
  codebook: null,
  codedPapers: [],
  evidenceSummary: buildEvidenceSummary([], []),
  gapMap: [],
  mapData: [],
  chartData: buildChartData([], []),
  errors,
});

const deriveKeywords = (query: string): string[] =>
  query
    .toLowerCase()
    .replace(/[()"']/g, " ")
    .split(/\s+(?:and|or|with|for|of|the|a|an|in|on|to)\s+|\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 3)
    .slice(0, 12);

const codePapers = async (papers: Paper[], codebook: ReviewCodebook, errors: string[]): Promise<CodedPaper[]> => {
  const coded: CodedPaper[] = [];
  for (const paper of papers) {
    try {
      coded.push(await codePaperWithLlm(paper, codebook));
    } catch (error) {
      errors.push(`Coding fallback used for “${paper.title}”: ${error instanceof Error ? error.message : "Unknown LLM error"}`);
      coded.push(codePaperDeterministically(paper, codebook));
    }
  }
  return coded;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ReviewRunResponse | { error: string }>): Promise<void> {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const parsed = reviewRunSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((issue) => issue.message).join(" ") });
    return;
  }

  const { query, maxResults } = parsed.data;
  const researchQuestion = parsed.data.researchQuestion?.trim() || query;
  const status = defaultStatus();
  const errors: string[] = [];
  let papers: Paper[] = [];
  let codebook: ReviewCodebook | null = null;
  let codedPapers: CodedPaper[] = [];

  try {
    papers = await searchOpenAlexWorks({ query, maxResults });
    status.search = "success";
    if (papers.length === 0) {
      errors.push("OpenAlex returned no papers for this query. Try a broader topic or fewer Boolean operators.");
      status.summary = "success";
      res.status(200).json({
        query,
        researchQuestion,
        status,
        papers,
        codebook: null,
        codedPapers: [],
        evidenceSummary: buildEvidenceSummary([], []),
        gapMap: [],
        mapData: [],
        chartData: buildChartData([], []),
        errors,
      });
      return;
    }
  } catch (error) {
    status.search = "failed";
    errors.push(error instanceof Error ? error.message : "OpenAlex search failed.");
    res.status(200).json(emptyResponse({ query, researchQuestion, status, errors }));
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    errors.push("LLM key required for codebook generation and automatic coding. Add OPENAI_API_KEY to enable the full review pipeline.");
    status.codebook = "skipped";
    status.coding = "skipped";
    status.summary = "success";
    res.status(200).json({
      query,
      researchQuestion,
      status,
      papers,
      codebook: null,
      codedPapers: [],
      evidenceSummary: buildEvidenceSummary(papers, []),
      gapMap: [],
      mapData: buildMapData(papers, []),
      chartData: buildChartData(papers, []),
      errors,
    });
    return;
  }

  try {
    const samplePapers = samplePapersForCodebook(papers, 15).map((paper) => ({
      title: paper.title,
      abstract: paper.abstract,
      year: paper.year,
    }));
    codebook = await generateCodebookWithLlm({ researchQuestion, keywords: deriveKeywords(query), samplePapers });
    status.codebook = "success";
  } catch (error) {
    status.codebook = "failed";
    status.coding = "skipped";
    status.summary = "success";
    errors.push(`Codebook generation failed: ${error instanceof Error ? error.message : "Unknown LLM error"}`);
    res.status(200).json({
      query,
      researchQuestion,
      status,
      papers,
      codebook: null,
      codedPapers: [],
      evidenceSummary: buildEvidenceSummary(papers, []),
      gapMap: [],
      mapData: buildMapData(papers, []),
      chartData: buildChartData(papers, []),
      errors,
    });
    return;
  }

  try {
    codedPapers = await codePapers(papers, codebook, errors);
    status.coding = "success";
  } catch (error) {
    status.coding = "failed";
    errors.push(`Paper coding failed: ${error instanceof Error ? error.message : "Unknown coding error"}`);
  }

  const chartData = buildChartData(papers, codedPapers);
  status.summary = "success";
  res.status(200).json({
    query,
    researchQuestion,
    status,
    papers,
    codebook,
    codedPapers,
    evidenceSummary: buildEvidenceSummary(papers, codedPapers),
    gapMap: buildGapMap(codedPapers, chartData),
    mapData: buildMapData(papers, codedPapers),
    chartData,
    errors,
  });
}

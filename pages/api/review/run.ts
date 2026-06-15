import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

import { samplePapersForCodebook } from "../../../src/lib/codebook";
import { buildChartData, buildEvidenceSummary, buildGapMap } from "../../../src/lib/evidence-summary";
import { generateCodebookWithLlm, codePaperWithLlm } from "../../../src/lib/llm";
import { buildMapData } from "../../../src/lib/map-data";
import { getOpenAlexTopicGroups, OPENALEX_REVIEW_MAX_RESULTS, searchOpenAlexWorks } from "../../../src/lib/openalex";
import { codePaperDeterministically } from "../../../src/lib/paper-coding";
import type { CodedPaper, CountValue, Paper, ReviewCodebook, ReviewRunResponse, ReviewRunStatus } from "../../../src/types/review";

const reviewRunSchema = z.object({
  query: z.string().trim().min(2, "Enter a research topic or question."),
  researchQuestion: z.string().trim().optional(),
  maxResults: z.number().int().min(1).max(OPENALEX_REVIEW_MAX_RESULTS).optional().default(OPENALEX_REVIEW_MAX_RESULTS),
});

const defaultStatus = (): ReviewRunStatus => ({
  search: "skipped",
  codebook: "skipped",
  coding: "skipped",
  summary: "skipped",
});

const emptyResponse = ({ query, researchQuestion, status, errors, openAlexTopics = [] }: { query: string; researchQuestion: string; status: ReviewRunStatus; errors: string[]; openAlexTopics?: CountValue[] }): ReviewRunResponse => ({
  query,
  researchQuestion,
  status,
  papers: [],
  codebook: null,
  codedPapers: [],
  evidenceSummary: buildEvidenceSummary([], []),
  gapMap: [],
  mapData: [],
  chartData: buildChartData([], [], openAlexTopics),
  errors,
});


const formatOpenAlexSearchError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : "OpenAlex search failed.";
  if (/status 503/.test(message)) {
    return "OpenAlex is temporarily unavailable or overloaded (503 Service Unavailable). Please wait a few minutes and retry the same search; if it keeps happening, narrow the query or try again later.";
  }
  if (/status 500/.test(message)) {
    return "OpenAlex returned a temporary server error (500). Please retry; if it repeats, narrow the query or try again later.";
  }
  if (/status 429/.test(message)) {
    return "OpenAlex rate-limited the request (429). Please wait before retrying.";
  }
  return message;
};

const deriveKeywords = (query: string): string[] =>
  query
    .toLowerCase()
    .replace(/[()"']/g, " ")
    .split(/\s+(?:and|or|with|for|of|the|a|an|in|on|to)\s+|\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 3)
    .slice(0, 12);

const LLM_CODING_LIMIT = 50;

const codePapers = async (papers: Paper[], codebook: ReviewCodebook, errors: string[]): Promise<CodedPaper[]> => {
  if (papers.length > LLM_CODING_LIMIT) {
    errors.push(`Large result set detected (${papers.length} papers). To avoid request timeouts, all papers were coded with the deterministic fallback; narrow the query for per-paper LLM coding.`);
    return papers.map((paper) => codePaperDeterministically(paper, codebook));
  }
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
  let openAlexTopics: CountValue[] = [];

  try {
    const [paperResults, topicResults] = await Promise.allSettled([
      searchOpenAlexWorks({ query, maxResults }),
      getOpenAlexTopicGroups({ query }),
    ]);
    if (paperResults.status === "rejected") throw paperResults.reason;
    papers = paperResults.value.filter((paper) => Boolean(paper.abstract?.trim()));
    if (topicResults.status === "fulfilled") {
      openAlexTopics = topicResults.value;
    } else {
      errors.push(`OpenAlex topic grouping unavailable: ${topicResults.reason instanceof Error ? topicResults.reason.message : "Unknown grouping error"}`);
    }
    openAlexTopics = buildChartData(papers, [], openAlexTopics).openAlexTopics;
    status.search = "success";
    if (papers.length === 0) {
      errors.push("OpenAlex returned no article records with usable abstracts for this query. Try a broader topic or fewer Boolean operators.");
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
        chartData: buildChartData([], [], openAlexTopics),
        errors,
      });
      return;
    }
  } catch (error) {
    status.search = "failed";
    errors.push(formatOpenAlexSearchError(error));
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
      chartData: buildChartData(papers, [], openAlexTopics),
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
      chartData: buildChartData(papers, [], openAlexTopics),
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

  try {
    const chartData = buildChartData(papers, codedPapers, openAlexTopics);
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
  } catch (error) {
    status.summary = "failed";
    errors.push(`Evidence summary failed: ${error instanceof Error ? error.message : "Unknown summary error"}`);
    res.status(200).json({
      query,
      researchQuestion,
      status,
      papers,
      codebook,
      codedPapers,
      evidenceSummary: buildEvidenceSummary(papers, []),
      gapMap: [],
      mapData: [],
      chartData: buildChartData(papers, [], openAlexTopics),
      errors,
    });
  }
}

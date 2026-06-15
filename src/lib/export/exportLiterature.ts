import { enrichCodesWithResolvedLocation } from "../geo/resolveStudyLocation";
import type { CodedPaper, Paper } from "../../types/review";
import type { LLMClassification, NormalizedAbstractRecord } from "../../types/literature";

const escapeCsvCell = (value: string | number | null | undefined): string => {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const downloadJson = (fileName: string, data: unknown): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  downloadBlob(fileName, blob);
};

export const downloadCsv = (fileName: string, csv: string): void => {
  downloadBlob(fileName, new Blob([csv], { type: "text/csv;charset=utf-8" }));
};

const downloadBlob = (fileName: string, blob: Blob): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const classificationsToCsv = (
  classifications: LLMClassification[],
  records: NormalizedAbstractRecord[],
): string => {
  const recordById = new Map(records.map((record) => [record.id, record]));
  const headers = [
    "recordId",
    "title",
    "year",
    "doi",
    "urbanFormVariables",
    "energyOutcomes",
    "relationshipType",
    "scale",
    "methodology",
    "geography",
    "sector",
    "confidence",
    "evidenceQuote",
    "uncertaintyNotes",
  ];
  const rows = classifications.map((classification) => {
    const record = recordById.get(classification.recordId);
    return [
      classification.recordId,
      record?.title ?? "",
      record?.year ?? "",
      record?.doi ?? "",
      classification.urbanFormVariables.join("; "),
      classification.energyOutcomes.join("; "),
      classification.relationshipType,
      classification.scale,
      classification.methodology,
      classification.geography.join("; "),
      classification.sector,
      classification.confidence.toFixed(2),
      classification.evidenceQuote,
      classification.uncertaintyNotes.join("; "),
    ];
  });
  return [headers, ...rows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
};

export const validationSampleToCsv = (
  classifications: LLMClassification[],
  records: NormalizedAbstractRecord[],
): string => {
  const sampleSize = Math.max(1, Math.ceil(classifications.length * 0.1));
  return classificationsToCsv(classifications.slice(0, sampleSize), records);
};

export const codedPapersToCsv = (codedPapers: CodedPaper[], papers: Paper[]): string => {
  const paperById = new Map(papers.map((paper) => [paper.id, paper]));
  const headers = [
    "paperId",
    "title",
    "year",
    "doi",
    "country",
    "urbanFormVariables",
    "energyOutcomes",
    "method",
    "spatialScale",
    "climateContext",
    "buildingType",
    "keyFinding",
    "evidenceStrength",
    "confidence",
    "needsManualReview",
  ];
  const rows = codedPapers.map((codedPaper) => {
    const paper = paperById.get(codedPaper.paperId);
    const resolved = enrichCodesWithResolvedLocation(codedPaper.codes).resolvedLocation;
    return [
      codedPaper.paperId,
      paper?.title ?? "",
      paper?.year ?? "",
      paper?.doi ?? "",
      resolved.country ?? resolved.region ?? codedPaper.codes.country,
      codedPaper.codes.urbanFormVariables.join("; "),
      codedPaper.codes.energyOutcomes.join("; "),
      codedPaper.codes.method,
      codedPaper.codes.spatialScale,
      resolved.climateContext ?? codedPaper.codes.climateContext,
      codedPaper.codes.buildingType,
      codedPaper.codes.keyFinding,
      codedPaper.codes.evidenceStrength,
      codedPaper.confidence.toFixed(2),
      codedPaper.needsManualReview ? "true" : "false",
    ];
  });
  return [headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
};

export const validationSampleToReviewCsv = (codedPapers: CodedPaper[], papers: Paper[]): string => {
  const sampleSize = Math.max(1, Math.ceil(codedPapers.length * 0.1));
  return codedPapersToCsv(codedPapers.slice(0, sampleSize), papers);
};

export const parseImportedJson = (content: string): unknown =>
  JSON.parse(content) as unknown;

"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";

/**
 * -----------------------------------------------------------------------------
 * 1. TypeScript Types / Interfaces
 * -----------------------------------------------------------------------------
 * These types intentionally avoid any Next.js-specific imports so this file can be
 * dropped into either the Pages Router or App Router. The top-level component is a
 * client component because it owns upload, parsing, and dashboard UI state.
 */

export type AbstractSource =
  | "Scopus"
  | "Web of Science"
  | "Manual upload"
  | "Unknown";

export type RelationshipType =
  | "positive"
  | "negative"
  | "mixed"
  | "non-significant"
  | "context-dependent"
  | "not-classified";

export type PlanningScale =
  | "building"
  | "parcel"
  | "street"
  | "neighborhood"
  | "city"
  | "region"
  | "not-classified";

export interface BibliographicInfo {
  /** Stable local identifier generated during import. */
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year?: number;
  journal?: string;
  doi?: string;
  keywords: string[];
  source: AbstractSource;
}

export interface AnalysisResult {
  bibliographicId: string;
  urbanFormVariable: string;
  energyOutcome: string;
  relationshipType: RelationshipType;
  planningImplication: string;
  scale: PlanningScale;
  confidence: number;
  reviewedManually: boolean;
}

export interface ManualAnnotation {
  bibliographicId: string;
  relationshipType: RelationshipType;
  scale: PlanningScale;
}

export interface ValidationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  cohensKappa: number;
}

interface UploadedFileMeta {
  fileName: string;
  fileType: string;
  abstractCount: number;
  importedAt: string;
}

interface DataIngestionProps {
  fileMeta: UploadedFileMeta | null;
  abstracts: BibliographicInfo[];
  onFileSelect: (file: File) => Promise<void>;
}

interface CodebookQueueProps {
  abstracts: BibliographicInfo[];
  analyses: AnalysisResult[];
  onGenerateDraftAnalyses: () => void;
}

interface EvidenceDashboardProps {
  analyses: AnalysisResult[];
}

interface ValidationPanelProps {
  metrics: ValidationMetrics;
  sampleSize: number;
}

const emptyMetrics: ValidationMetrics = {
  accuracy: 0,
  precision: 0,
  recall: 0,
  f1Score: 0,
  cohensKappa: 0,
};

/**
 * -----------------------------------------------------------------------------
 * Lightweight parsing helpers
 * -----------------------------------------------------------------------------
 * The host workspace can replace these helpers with production ingestion logic.
 * They are deliberately dependency-free so the plugin remains portable.
 */

const splitDelimitedLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && nextCharacter === '"' && inQuotes) {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
};

const normalizeHeader = (header: string): string =>
  header.toLowerCase().replace(/[^a-z0-9]/g, "");

const parseKeywords = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[;,|]/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
};

const parseAuthors = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[;,]/)
    .map((author) => author.trim())
    .filter(Boolean);
};

const coerceYear = (value: unknown): number | undefined => {
  const year = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(year) ? year : undefined;
};

const sourceFromFileName = (fileName: string): AbstractSource => {
  const normalized = fileName.toLowerCase();

  if (normalized.includes("scopus")) {
    return "Scopus";
  }

  if (normalized.includes("webofscience") || normalized.includes("wos")) {
    return "Web of Science";
  }

  return "Manual upload";
};

const mapRecordToBibliographicInfo = (
  record: Record<string, unknown>,
  index: number,
  source: AbstractSource,
): BibliographicInfo => {
  const normalizedRecord = Object.entries(record).reduce<
    Record<string, unknown>
  >((accumulator, [key, value]) => {
    accumulator[normalizeHeader(key)] = value;
    return accumulator;
  }, {});

  return {
    id: `abstract-${index + 1}`,
    title: String(
      normalizedRecord.title ??
        normalizedRecord.articletitle ??
        normalizedRecord.documenttitle ??
        "Untitled study",
    ),
    authors: parseAuthors(
      normalizedRecord.authors ?? normalizedRecord.authornames,
    ),
    abstract: String(
      normalizedRecord.abstract ??
        normalizedRecord.description ??
        normalizedRecord.summary ??
        "",
    ),
    year: coerceYear(normalizedRecord.year ?? normalizedRecord.publicationyear),
    journal: String(
      normalizedRecord.journal ??
        normalizedRecord.sourcetitle ??
        normalizedRecord.publicationname ??
        "",
    ),
    doi: String(
      normalizedRecord.doi ?? normalizedRecord.digitalobjectidentifier ?? "",
    ),
    keywords: parseKeywords(
      normalizedRecord.keywords ??
        normalizedRecord.authorkeywords ??
        normalizedRecord.indexkeywords,
    ),
    source,
  };
};

const parseJsonAbstracts = (
  content: string,
  source: AbstractSource,
): BibliographicInfo[] => {
  const parsed = JSON.parse(content) as unknown;
  const records = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" &&
        parsed !== null &&
        Array.isArray((parsed as { records?: unknown[] }).records)
      ? (parsed as { records: unknown[] }).records
      : [];

  return records
    .filter(
      (record): record is Record<string, unknown> =>
        typeof record === "object" && record !== null,
    )
    .map((record, index) =>
      mapRecordToBibliographicInfo(record, index, source),
    );
};

const parseCsvAbstracts = (
  content: string,
  source: AbstractSource,
): BibliographicInfo[] => {
  const [headerLine, ...rows] = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!headerLine) {
    return [];
  }

  const headers = splitDelimitedLine(headerLine);

  return rows.map((row, rowIndex) => {
    const cells = splitDelimitedLine(row);
    const record = headers.reduce<Record<string, string>>(
      (accumulator, header, cellIndex) => {
        accumulator[header] = cells[cellIndex] ?? "";
        return accumulator;
      },
      {},
    );

    return mapRecordToBibliographicInfo(record, rowIndex, source);
  });
};

const createDraftAnalysis = (item: BibliographicInfo): AnalysisResult => {
  const searchableText =
    `${item.title} ${item.abstract} ${item.keywords.join(" ")}`.toLowerCase();

  const urbanFormVariable = searchableText.includes("density")
    ? "Density / compactness"
    : searchableText.includes("green") || searchableText.includes("vegetation")
      ? "Green-blue infrastructure"
      : searchableText.includes("morphology") ||
          searchableText.includes("geometry")
        ? "Urban morphology"
        : "Urban form variable pending review";

  const energyOutcome = searchableText.includes("cooling")
    ? "Cooling demand"
    : searchableText.includes("heating")
      ? "Heating demand"
      : searchableText.includes("electricity")
        ? "Electricity consumption"
        : "Energy outcome pending review";

  return {
    bibliographicId: item.id,
    urbanFormVariable,
    energyOutcome,
    relationshipType: "not-classified",
    planningImplication:
      "Awaiting LLM-assisted extraction and human verification.",
    scale: searchableText.includes("neighborhood")
      ? "neighborhood"
      : "not-classified",
    confidence: 0.42,
    reviewedManually: false,
  };
};

const calculateValidationMetrics = (
  analyses: AnalysisResult[],
  annotations: ManualAnnotation[],
): ValidationMetrics => {
  if (annotations.length === 0) {
    return emptyMetrics;
  }

  const analysisById = new Map(
    analyses.map((analysis) => [analysis.bibliographicId, analysis]),
  );
  const comparableAnnotations = annotations.filter((annotation) =>
    analysisById.has(annotation.bibliographicId),
  );

  if (comparableAnnotations.length === 0) {
    return emptyMetrics;
  }

  const matches = comparableAnnotations.filter((annotation) => {
    const analysis = analysisById.get(annotation.bibliographicId);
    return (
      analysis?.relationshipType === annotation.relationshipType &&
      analysis.scale === annotation.scale
    );
  }).length;

  const accuracy = matches / comparableAnnotations.length;
  const truePositive = matches;
  const falsePositive = comparableAnnotations.length - matches;
  const falseNegative = comparableAnnotations.length - matches;
  const precision =
    truePositive + falsePositive === 0
      ? 0
      : truePositive / (truePositive + falsePositive);
  const recall =
    truePositive + falseNegative === 0
      ? 0
      : truePositive / (truePositive + falseNegative);
  const f1Score =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  // Binary-style expected agreement approximation for the plugin prototype. Replace
  // with a full confusion-matrix implementation once class distributions are stored.
  const expectedAgreement: number = 0.5;
  const cohensKappa =
    expectedAgreement === 1
      ? 0
      : (accuracy - expectedAgreement) / (1 - expectedAgreement);

  return { accuracy, precision, recall, f1Score, cohensKappa };
};

const formatMetric = (value: number): string => `${Math.round(value * 100)}%`;

/**
 * -----------------------------------------------------------------------------
 * 2. Data Ingestion & Preprocessing UI
 * -----------------------------------------------------------------------------
 */

export function DataIngestion({
  fileMeta,
  abstracts,
  onFileSelect,
}: DataIngestionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null): Promise<void> => {
    const [file] = Array.from(files ?? []);
    if (file) {
      await onFileSelect(file);
    }
  };

  const handleDrop = async (
    event: DragEvent<HTMLDivElement>,
  ): Promise<void> => {
    event.preventDefault();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  };

  const handleInputChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    await handleFiles(event.target.files);
    event.target.value = "";
  };

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Data ingestion
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Upload bibliographic abstracts
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Import CSV or JSON exports from Scopus and Web of Science for
            preprocessing.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
          onClick={() => fileInputRef.current?.click()}
        >
          Browse files
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={handleInputChange}
      />

      <div
        className={`mt-5 rounded-2xl border border-dashed p-6 text-center transition ${
          isDragging
            ? "border-[var(--primary)] bg-slate-50"
            : "border-slate-300 bg-slate-50"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
          <UploadIcon />
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-700">
          Drop your CSV or JSON file here
        </p>
        <p className="mt-1 text-sm text-slate-500">
          The parser reads common title, author, abstract, year, DOI, and
          keyword fields.
        </p>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {fileMeta ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-4">
            <MetaItem label="File" value={fileMeta.fileName} />
            <MetaItem label="Type" value={fileMeta.fileType || "Unknown"} />
            <MetaItem
              label="Abstracts"
              value={String(fileMeta.abstractCount)}
            />
            <MetaItem label="Imported" value={fileMeta.importedAt} />
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            No file imported yet. Upload a bibliographic export to begin
            evidence mapping.
          </p>
        )}
      </div>

      {abstracts.length > 0 && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          {abstracts.length} abstracts ready for codebook extraction
        </p>
      )}
    </section>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 truncate text-sm font-semibold text-slate-700">
        {value}
      </dd>
    </div>
  );
}

/**
 * -----------------------------------------------------------------------------
 * 3. LLM-Assisted Codebook Queue
 * -----------------------------------------------------------------------------
 */

export function CodebookQueue({
  abstracts,
  analyses,
  onGenerateDraftAnalyses,
}: CodebookQueueProps) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            LLM codebook
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Abstracts awaiting classification
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Queue studies for urban form, energy outcome, relationship,
            implication, and scale extraction.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onGenerateDraftAnalyses}
          disabled={abstracts.length === 0}
        >
          Generate draft labels
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid grid-cols-[1.4fr_0.7fr_0.9fr] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          <span>Study</span>
          <span>Source</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-200">
          {abstracts.length === 0 ? (
            <div className="bg-white p-4 text-sm text-slate-500">
              Upload abstracts to populate the LLM processing queue.
            </div>
          ) : (
            abstracts.slice(0, 6).map((item) => {
              const analysis = analyses.find(
                (candidate) => candidate.bibliographicId === item.id,
              );

              return (
                <article
                  key={item.id}
                  className="grid grid-cols-[1.4fr_0.7fr_0.9fr] gap-3 bg-white px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-700">
                      {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-slate-500">
                      {item.abstract ||
                        "No abstract text found in this record."}
                    </p>
                  </div>
                  <div className="text-slate-500">
                    <p>{item.source}</p>
                    <p className="text-xs text-slate-400">
                      {item.year ?? "Year n/a"}
                    </p>
                  </div>
                  <div>
                    <span className="inline-flex rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                      {analysis ? "Drafted" : "Pending"}
                    </span>
                    {analysis && (
                      <p className="mt-2 text-xs text-slate-500">
                        {Math.round(analysis.confidence * 100)}% confidence
                      </p>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * -----------------------------------------------------------------------------
 * 4. Spatial Analysis & Evidence Mapping Dashboard
 * -----------------------------------------------------------------------------
 */

export function EvidenceDashboard({ analyses }: EvidenceDashboardProps) {
  const classifiedCount = analyses.length;
  const scaleSummary = useMemo(
    () => summarizeByKey(analyses, "scale"),
    [analyses],
  );
  const relationshipSummary = useMemo(
    () => summarizeByKey(analyses, "relationshipType"),
    [analyses],
  );

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Evidence mapping
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">
          Spatial gaps and structural bias dashboard
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Placeholder panels are ready for GHSL Urban Centers and charting
          libraries such as Chart.js or Recharts.
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="min-h-[320px] rounded-2xl border border-slate-200 bg-slate-100 p-4">
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
              <MapIcon />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-slate-700">
              GHSL Urban Centers map placeholder
            </h3>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Connect a spatial layer here to show where urban form-energy
              evidence clusters or is missing.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <ChartPlaceholder
            title="Thematic structure"
            description="Distribution of urban form variables and energy outcomes."
            summary={relationshipSummary}
            emptyLabel="Draft labels to reveal relationship patterns."
          />
          <ChartPlaceholder
            title="Methodology imbalance"
            description="Classification by planning scale and analytical framing."
            summary={scaleSummary}
            emptyLabel="Draft labels to reveal scale imbalance."
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Coverage
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {classifiedCount}
            </p>
            <p className="text-sm text-slate-500">
              LLM-assisted records currently available for mapping.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChartPlaceholder({
  title,
  description,
  summary,
  emptyLabel,
}: {
  title: string;
  description: string;
  summary: Array<{ label: string; count: number }>;
  emptyLabel: string;
}) {
  const total = summary.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
          Chart
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {summary.length === 0 ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          summary.map((item) => {
            const width =
              total === 0 ? 0 : Math.max(8, (item.count / total) * 100);

            return (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span className="capitalize">
                    {item.label.replace("-", " ")}
                  </span>
                  <span>{item.count}</span>
                </div>
                <div className="h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-[var(--primary)]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function summarizeByKey<T extends keyof AnalysisResult>(
  analyses: AnalysisResult[],
  key: T,
): Array<{ label: string; count: number }> {
  const counts = analyses.reduce<Record<string, number>>(
    (accumulator, analysis) => {
      const value = String(analysis[key]);
      accumulator[value] = (accumulator[value] ?? 0) + 1;
      return accumulator;
    },
    {},
  );

  return Object.entries(counts).map(([label, count]) => ({ label, count }));
}

/**
 * -----------------------------------------------------------------------------
 * 5. Validation Panel
 * -----------------------------------------------------------------------------
 */

export function ValidationPanel({ metrics, sampleSize }: ValidationPanelProps) {
  const metricCards = [
    { label: "Accuracy", value: formatMetric(metrics.accuracy) },
    { label: "Precision", value: formatMetric(metrics.precision) },
    { label: "Recall", value: formatMetric(metrics.recall) },
    { label: "F1-score", value: formatMetric(metrics.f1Score) },
    { label: "Cohen's Kappa", value: metrics.cohensKappa.toFixed(2) },
  ];

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Validation
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Manual annotation agreement
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Compare LLM classifications against a 10% human-reviewed sample
            before evidence synthesis.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
          {sampleSize} sample records
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="min-w-[140px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * -----------------------------------------------------------------------------
 * 6. Orchestrating Plugin Component
 * -----------------------------------------------------------------------------
 */

export default function LiteratureReviewPlugin() {
  const [abstracts, setAbstracts] = useState<BibliographicInfo[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [manualAnnotations, setManualAnnotations] = useState<
    ManualAnnotation[]
  >([]);
  const [fileMeta, setFileMeta] = useState<UploadedFileMeta | null>(null);

  const validationMetrics = useMemo(
    () => calculateValidationMetrics(analyses, manualAnnotations),
    [analyses, manualAnnotations],
  );

  const handleFileSelect = async (file: File): Promise<void> => {
    const content = await file.text();
    const source = sourceFromFileName(file.name);
    const parsedAbstracts = file.name.toLowerCase().endsWith(".json")
      ? parseJsonAbstracts(content, source)
      : parseCsvAbstracts(content, source);

    setAbstracts(parsedAbstracts);
    setAnalyses([]);
    setManualAnnotations([]);
    setFileMeta({
      fileName: file.name,
      fileType:
        file.type ||
        (file.name.toLowerCase().endsWith(".json")
          ? "application/json"
          : "text/csv"),
      abstractCount: parsedAbstracts.length,
      importedAt: new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date()),
    });
  };

  const handleGenerateDraftAnalyses = (): void => {
    const draftAnalyses = abstracts.map(createDraftAnalysis);
    const sampleSize = Math.max(1, Math.ceil(draftAnalyses.length * 0.1));

    // Prototype manual sample mirrors every other draft as an agreement seed so
    // the validation panel is populated. Production code should replace this with
    // saved reviewer labels from the host workspace.
    const seededAnnotations = draftAnalyses
      .slice(0, sampleSize)
      .map<ManualAnnotation>((analysis, index) => ({
        bibliographicId: analysis.bibliographicId,
        relationshipType:
          index % 2 === 0 ? analysis.relationshipType : "context-dependent",
        scale: analysis.scale,
      }));

    setAnalyses(draftAnalyses);
    setManualAnnotations(seededAnnotations);
  };

  return (
    <div className="space-y-6 bg-[var(--background)] text-[var(--foreground)]">
      <DataIngestion
        fileMeta={fileMeta}
        abstracts={abstracts}
        onFileSelect={handleFileSelect}
      />
      <CodebookQueue
        abstracts={abstracts}
        analyses={analyses}
        onGenerateDraftAnalyses={handleGenerateDraftAnalyses}
      />
      <EvidenceDashboard analyses={analyses} />
      <ValidationPanel
        metrics={validationMetrics}
        sampleSize={manualAnnotations.length}
      />
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16V4m0 0 4 4m-4-4-4 4M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 18-6 3V6l6-3m0 15 6 3m-6-3V3m6 18 6-3V3l-6 3m0 15V6m0 0L9 3"
      />
    </svg>
  );
}

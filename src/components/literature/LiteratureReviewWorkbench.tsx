"use client";

import {
  Activity,
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Network,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { parseImportedJson } from "../../lib/export/exportLiterature";
import {
  classificationsToCsv,
  downloadCsv,
  downloadJson,
  validationSampleToCsv,
} from "../../lib/export/exportLiterature";
import {
  useLiteraturePipeline,
  type LiteraturePipelineController,
} from "../../hooks/useLiteraturePipeline";
import type {
  CodebookDimension,
  EvidenceMatrixCell,
  LLMClassification,
  NormalizedAbstractRecord,
  PipelineRunState,
  PipelineStageStatus,
  WosSearchConfig,
} from "../../types/literature";

const cardClass =
  "rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm";
const innerClass = "rounded-2xl border border-slate-200 bg-slate-50 p-4";
const primaryButtonClass =
  "rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50";
const badgeClass =
  "text-xs font-semibold uppercase tracking-[0.3em] text-slate-400";
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[var(--primary)]";

const chartPalette = [
  "#475569",
  "#64748b",
  "#94a3b8",
  "#334155",
  "#0f172a",
  "#64748b",
];

const ErrorBox = ({ message }: { message?: string }) =>
  message ? (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      {message}
    </div>
  ) : null;

const EmptyState = ({ children }: { children: string }) => (
  <div className={innerClass}>
    <p className="text-sm text-slate-500">{children}</p>
  </div>
);

const countEntries = (
  counts: Record<string, number>,
): Array<{ name: string; value: number }> =>
  Object.entries(counts)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

export default function LiteratureReviewWorkbench() {
  const pipeline = useLiteraturePipeline();

  return (
    <div className="space-y-6 bg-[var(--background)] text-[var(--foreground)]">
      <header className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className={badgeClass}>Systematic review workbench</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              {process.env.NEXT_PUBLIC_APP_NAME ??
                "Urban Form & Energy Evidence Map"}
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Web of Science → LLM topic modeling → automatic codebook →
              evidence map
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill
              label={
                pipeline.mockWos || pipeline.mockLlm ? "Mock mode" : "Live WoS"
              }
              tone={pipeline.mockWos || pipeline.mockLlm ? "amber" : "slate"}
            />
            <StatusPill label={`${pipeline.records.length} retrieved`} />
            <StatusPill
              label={`${pipeline.classifications.length} classified`}
            />
          </div>
        </div>
      </header>

      <PipelineStatusBar runState={pipeline.runState} />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <SearchConfigPanel pipeline={pipeline} />
          <WosRetrievalPanel pipeline={pipeline} />
          <ExportPanel pipeline={pipeline} />
        </div>
        <div className="space-y-6">
          <RecordsPreviewTable pipeline={pipeline} />
          <div className="grid gap-6 lg:grid-cols-2">
            <TopicModelingPanel pipeline={pipeline} />
            <GeneratedCodebookPanel pipeline={pipeline} />
          </div>
          <ClassificationPanel pipeline={pipeline} />
          <EvidenceMapDashboard pipeline={pipeline} />
        </div>
      </div>
    </div>
  );
}

function StatusPill({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "amber";
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-slate-200 bg-slate-50 text-slate-600"
      }`}
    >
      {label}
    </span>
  );
}

function PipelineStatusBar({ runState }: { runState: PipelineRunState }) {
  const stages: Array<{ key: keyof PipelineRunState; label: string }> = [
    { key: "retrieve", label: "Retrieve literature" },
    { key: "normalize", label: "Normalize abstracts" },
    { key: "topics", label: "Discover topics" },
    { key: "codebook", label: "Generate codebook" },
    { key: "classify", label: "Classify evidence" },
    { key: "map", label: "Map evidence" },
  ];
  return (
    <section className={cardClass}>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage, index) => (
          <div key={stage.key} className={innerClass}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400">
                {index + 1}
              </span>
              <StageIcon status={runState[stage.key].status} />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {stage.label}
            </p>
            <p className="mt-1 text-xs capitalize text-slate-500">
              {runState[stage.key].status} · {runState[stage.key].count} items
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StageIcon({ status }: { status: PipelineStageStatus }) {
  if (status === "success")
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "running")
    return <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />;
  if (status === "error")
    return <AlertCircle className="h-4 w-4 text-amber-600" />;
  return <Activity className="h-4 w-4 text-slate-400" />;
}

function SearchConfigPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const [draft, setDraft] = useState<WosSearchConfig>(pipeline.searchConfig);

  useEffect(() => {
    setDraft(pipeline.searchConfig);
  }, [pipeline.searchConfig]);

  const updateDraft = <TKey extends keyof WosSearchConfig>(
    key: TKey,
    value: WosSearchConfig[TKey],
  ) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    pipeline.setSearchConfig(next);
  };

  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={badgeClass}>Search configuration</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Predefined Web of Science query
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Searches topic fields for urban form, urban heat island and urban
            meteorology with energy terms.
          </p>
        </div>
        <Search className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Query
          </span>
          <textarea
            className={`${inputClass} mt-1 min-h-24`}
            value={draft.query}
            onChange={(event) => updateDraft("query", event.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <NumberInput
            label="Start year"
            value={draft.yearStart}
            onChange={(value) => updateDraft("yearStart", value)}
          />
          <NumberInput
            label="End year"
            value={draft.yearEnd}
            onChange={(value) => updateDraft("yearEnd", value)}
          />
          <NumberInput
            label="Max records"
            value={draft.count}
            onChange={(value) => updateDraft("count", value)}
          />
        </div>
        <div className={innerClass}>
          <p className="text-sm font-semibold text-slate-700">
            {pipeline.apiKeyDetected === false
              ? "Missing WOS_API_KEY"
              : pipeline.apiKeyDetected
                ? "Server API key detected"
                : "API key checked after first request"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            The key is read only from server-side environment variables.
          </p>
        </div>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={pipeline.runSearch}
          disabled={pipeline.runState.retrieve.status === "running"}
        >
          Run Web of Science Search
        </button>
        <ErrorBox message={pipeline.runState.retrieve.error} />
      </div>
    </section>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      <input
        className={`${inputClass} mt-1`}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function WosRetrievalPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={badgeClass}>Retrieval</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Web of Science records
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Retrieve records server-side, then normalize abstracts for
            screening.
          </p>
        </div>
        <Database className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Retrieved" value={pipeline.records.length} />
        <Metric label="Normalized" value={pipeline.normalizedRecords.length} />
        <Metric label="Warnings" value={pipeline.warnings.length} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.normalizeRecords}
          disabled={pipeline.records.length === 0}
        >
          Normalize records
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.resetPipeline}
        >
          Reset workbench
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {pipeline.warnings.slice(-3).map((warning) => (
          <div
            key={warning}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
          >
            {warning}
          </div>
        ))}
        <ErrorBox message={pipeline.runState.normalize.error} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={innerClass}>
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function RecordsPreviewTable({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const [filter, setFilter] = useState("");
  const source =
    pipeline.normalizedRecords.length > 0
      ? pipeline.normalizedRecords
      : pipeline.records;
  const rows = useMemo(() => {
    const needle = filter.toLowerCase();
    return source.filter((record) =>
      `${record.title} ${"journal" in record ? record.journal : ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [filter, source]);

  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={badgeClass}>Records preview</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Bibliographic metadata and abstracts
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Search, inspect abstract availability and candidate geography before
            LLM steps.
          </p>
        </div>
        <input
          className={`${inputClass} md:max-w-xs`}
          placeholder="Filter records"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        {rows.length === 0 ? (
          <div className="bg-slate-50 p-4 text-sm text-slate-500">
            No records yet. Run Web of Science search first.
          </div>
        ) : (
          <table className="min-w-[960px] divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Authors</th>
                <th className="px-4 py-3">DOI</th>
                <th className="px-4 py-3">Abstract</th>
                <th className="px-4 py-3">Locations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-600">
              {rows.slice(0, 20).map((record) => (
                <tr key={record.id}>
                  <td className="max-w-xs px-4 py-3 font-semibold text-slate-800">
                    {record.title}
                  </td>
                  <td className="px-4 py-3">{record.year ?? "—"}</td>
                  <td className="px-4 py-3">{record.journal}</td>
                  <td className="px-4 py-3">
                    {record.authors.slice(0, 2).join("; ")}
                  </td>
                  <td className="px-4 py-3">{record.doi || "—"}</td>
                  <td className="px-4 py-3">
                    {record.abstract ? "Available" : "Missing"}
                  </td>
                  <td className="px-4 py-3">
                    {"candidateLocations" in record
                      ? record.candidateLocations.join("; ") || "—"
                      : record.countries.join("; ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function TopicModelingPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const recordTitleById = new Map(
    pipeline.normalizedRecords.map((record) => [record.id, record.title]),
  );
  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={badgeClass}>Topic modeling</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Discovered thematic clusters
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            LLM discovers corpus topics before the codebook is generated.
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.runTopicModeling}
          disabled={
            pipeline.normalizedRecords.length === 0 ||
            pipeline.runState.topics.status === "running"
          }
        >
          Run LLM Topic Modeling
        </button>
      </div>
      <div className="mt-4 space-y-3">
        <ErrorBox message={pipeline.runState.topics.error} />
        {!pipeline.topicModel ? (
          <EmptyState>
            Normalize abstracts, then run topic modeling to discover clusters.
          </EmptyState>
        ) : (
          pipeline.topicModel.clusters.map((cluster) => (
            <article key={cluster.id} className={innerClass}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  {cluster.label}
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {Math.round(cluster.confidence * 100)}%
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {cluster.description}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Keywords: {cluster.keywords.join(", ")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
                {cluster.representativeRecordIds.slice(0, 3).map((id) => (
                  <li key={id}>{recordTitleById.get(id) ?? id}</li>
                ))}
              </ul>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function GeneratedCodebookPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={badgeClass}>Draft codebook</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Generated coding dimensions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Categories are generated from discovered topics and sample
            abstracts. Edit later.
          </p>
        </div>
        <BookOpen className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.generateCodebook}
          disabled={
            !pipeline.topicModel ||
            pipeline.runState.codebook.status === "running"
          }
        >
          Generate Draft Codebook
        </button>
      </div>
      <div className="mt-4 space-y-3">
        <ErrorBox message={pipeline.runState.codebook.error} />
        {!pipeline.codebook ? (
          <EmptyState>
            Run topic modeling, then generate a draft codebook.
          </EmptyState>
        ) : (
          pipeline.codebook.dimensions.map((dimension) => (
            <CodebookDimensionView key={dimension.id} dimension={dimension} />
          ))
        )}
      </div>
    </section>
  );
}

function CodebookDimensionView({
  dimension,
}: {
  dimension: CodebookDimension;
}) {
  return (
    <details className={innerClass}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        {dimension.name} · {dimension.categories.length} categories
      </summary>
      <p className="mt-2 text-sm text-slate-500">{dimension.description}</p>
      <div className="mt-3 space-y-2">
        {dimension.categories.slice(0, 5).map((category) => (
          <div
            key={category.id}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <p className="text-sm font-semibold text-slate-700">
              {category.label}
            </p>
            <p className="mt-1 text-xs text-slate-500">{category.definition}</p>
            <p className="mt-2 text-xs text-slate-500">
              Include: {category.inclusionCriteria.join("; ")}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Exclude: {category.exclusionCriteria.join("; ")}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}

function ClassificationPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const recordById = new Map(
    pipeline.normalizedRecords.map((record) => [record.id, record]),
  );
  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className={badgeClass}>Classification</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Abstract-level evidence coding
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Classify included abstracts using the generated codebook and retain
            evidence quotes.
          </p>
        </div>
        <button
          type="button"
          className={primaryButtonClass}
          onClick={pipeline.classifyRecords}
          disabled={
            !pipeline.codebook ||
            pipeline.runState.classify.status === "running"
          }
        >
          Classify Abstracts
        </button>
      </div>
      <div className="mt-4">
        <ErrorBox message={pipeline.runState.classify.error} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        {pipeline.classifications.length === 0 ? (
          <div className="bg-slate-50 p-4 text-sm text-slate-500">
            Generate a codebook, then classify abstracts.
          </div>
        ) : (
          <table className="min-w-[1100px] divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Urban form</th>
                <th className="px-4 py-3">Energy outcome</th>
                <th className="px-4 py-3">Relationship</th>
                <th className="px-4 py-3">Scale</th>
                <th className="px-4 py-3">Methodology</th>
                <th className="px-4 py-3">Geography</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-600">
              {pipeline.classifications.map((classification) => (
                <ClassificationRow
                  key={classification.recordId}
                  classification={classification}
                  record={recordById.get(classification.recordId)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function ClassificationRow({
  classification,
  record,
}: {
  classification: LLMClassification;
  record?: NormalizedAbstractRecord;
}) {
  const lowConfidence = classification.confidence < 0.6;
  return (
    <tr className={lowConfidence ? "bg-amber-50/60" : undefined}>
      <td className="max-w-xs px-4 py-3 font-semibold text-slate-800">
        {record?.title ?? classification.recordId}
      </td>
      <td className="px-4 py-3">
        {classification.urbanFormVariables.join("; ")}
      </td>
      <td className="px-4 py-3">{classification.energyOutcomes.join("; ")}</td>
      <td className="px-4 py-3">{classification.relationshipType}</td>
      <td className="px-4 py-3">{classification.scale}</td>
      <td className="px-4 py-3">{classification.methodology}</td>
      <td className="px-4 py-3">{classification.geography.join("; ")}</td>
      <td className="px-4 py-3 font-semibold">
        {Math.round(classification.confidence * 100)}%
      </td>
    </tr>
  );
}

function EvidenceMapDashboard({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const summary = pipeline.evidenceMap;
  const [selectedCell, setSelectedCell] = useState<EvidenceMatrixCell | null>(
    null,
  );
  const recordById = new Map(
    pipeline.normalizedRecords.map((record) => [record.id, record]),
  );

  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={badgeClass}>Evidence map</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Computed evidence mapping dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Counts and gaps are deterministic outputs from current
            classifications.
          </p>
        </div>
        <BarChart3 className="h-5 w-5 text-slate-400" />
      </div>
      {!summary ? (
        <div className="mt-4">
          <EmptyState>
            Classify records to compute evidence maps, charts and research gaps.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Metric label="Total retrieved" value={summary.totalRecords} />
            <Metric
              label="Included abstracts"
              value={summary.includedRecords}
            />
            <Metric
              label="Topics discovered"
              value={pipeline.topicModel?.clusters.length ?? 0}
            />
            <Metric
              label="Classified"
              value={pipeline.classifications.length}
            />
            <Metric
              label="Low confidence"
              value={summary.lowConfidenceRecordIds.length}
            />
          </div>
          <EvidenceMatrix
            matrix={summary.evidenceMatrix}
            onSelectCell={setSelectedCell}
          />
          {selectedCell && (
            <div className={innerClass}>
              <p className="text-sm font-semibold text-slate-800">
                {selectedCell.urbanFormVariable} × {selectedCell.energyOutcome}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-500">
                {selectedCell.recordIds.map((id) => (
                  <li key={id}>{recordById.get(id)?.title ?? id}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard
              title="Thematic structure"
              data={countEntries(summary.topicCounts)}
            />
            <ChartCard
              title="Temporal trend"
              data={countEntries(summary.yearCounts).sort((a, b) =>
                a.name.localeCompare(b.name),
              )}
            />
            <ChartCard
              title="Methodology imbalance"
              data={countEntries(summary.methodologyCounts)}
            />
            <ChartCard
              title="Scale imbalance"
              data={countEntries(summary.scaleCounts)}
            />
            <ChartCard
              title="Relationship type"
              data={countEntries(summary.relationshipCounts)}
            />
            <GeographyPanel counts={summary.geographyCounts} />
          </div>
          <ResearchGapsPanel pipeline={pipeline} />
        </div>
      )}
    </section>
  );
}

function EvidenceMatrix({
  matrix,
  onSelectCell,
}: {
  matrix: EvidenceMatrixCell[];
  onSelectCell: (cell: EvidenceMatrixCell) => void;
}) {
  const rows = Array.from(
    new Set(matrix.map((cell) => cell.urbanFormVariable)),
  ).sort();
  const columns = Array.from(
    new Set(matrix.map((cell) => cell.energyOutcome)),
  ).sort();
  const byKey = new Map(
    matrix.map((cell) => [
      `${cell.urbanFormVariable}__${cell.energyOutcome}`,
      cell,
    ]),
  );

  if (matrix.length === 0)
    return <EmptyState>No evidence matrix cells yet.</EmptyState>;

  return (
    <div className={innerClass}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Urban form × energy outcome matrix
        </h3>
        <Network className="h-4 w-4 text-slate-400" />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-slate-200 bg-white p-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Urban form
              </th>
              {columns.map((column) => (
                <th
                  key={column}
                  className="border border-slate-200 bg-white p-2 text-left text-xs font-semibold text-slate-500"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <th className="border border-slate-200 bg-white p-2 text-left font-semibold text-slate-700">
                  {row}
                </th>
                {columns.map((column) => {
                  const cell = byKey.get(`${row}__${column}`);
                  return (
                    <td
                      key={column}
                      className="border border-slate-200 bg-white p-2"
                    >
                      {cell ? (
                        <button
                          type="button"
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-[var(--primary)]"
                          onClick={() => onSelectCell(cell)}
                        >
                          {cell.count}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">0</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  data,
}: {
  title: string;
  data: Array<{ name: string; value: number }>;
}) {
  return (
    <div className={innerClass}>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          No classified data available for this chart.
        </p>
      ) : (
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ left: 0, right: 8, top: 8, bottom: 44 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={chartPalette[index % chartPalette.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function GeographyPanel({ counts }: { counts: Record<string, number> }) {
  const rows = countEntries(counts).slice(0, 12);
  return (
    <div className={innerClass}>
      <h3 className="text-sm font-semibold text-slate-800">
        Geography imbalance
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        GHSL join pending; extracted country/location counts are shown below.
      </p>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No geography extracted yet.</p>
        ) : (
          rows.map((row) => (
            <div
              key={row.name}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="font-semibold text-slate-700">{row.name}</span>
              <span className="text-slate-500">{row.value}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ResearchGapsPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const gaps = pipeline.evidenceMap?.researchGaps ?? [];
  return (
    <div className={innerClass}>
      <h3 className="text-sm font-semibold text-slate-800">Research gaps</h3>
      <p className="mt-1 text-sm text-slate-500">
        Generated deterministically from sparse matrix cells and imbalanced
        counts.
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {gaps.length === 0 ? (
          <p className="text-sm text-slate-500">No gaps computed yet.</p>
        ) : (
          gaps.map((gap) => (
            <div
              key={gap.id}
              className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600"
            >
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                {gap.severity}
              </span>
              <p className="mt-1">{gap.statement}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ExportPanel({ pipeline }: { pipeline: LiteraturePipelineController }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canExportClassifications = pipeline.classifications.length > 0;

  const importJson = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    const parsed = parseImportedJson(await file.text());
    if (typeof parsed === "object" && parsed !== null) {
      pipeline.importExistingJson(
        parsed as Parameters<typeof pipeline.importExistingJson>[0],
      );
    }
    event.target.value = "";
  };

  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={badgeClass}>Exports</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Download review artifacts
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Export normalized records, generated codebook, classifications and
            computed evidence map.
          </p>
        </div>
        <Download className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadJson("normalized-records.json", pipeline.normalizedRecords)
          }
          disabled={pipeline.normalizedRecords.length === 0}
        >
          Export normalized JSON
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadJson("generated-codebook.json", pipeline.codebook)
          }
          disabled={!pipeline.codebook}
        >
          Export codebook JSON
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadJson("classifications.json", pipeline.classifications)
          }
          disabled={!canExportClassifications}
        >
          Export classifications JSON
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadJson("evidence-map-summary.json", pipeline.evidenceMap)
          }
          disabled={!pipeline.evidenceMap}
        >
          Export evidence map JSON
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadCsv(
              "classifications.csv",
              classificationsToCsv(
                pipeline.classifications,
                pipeline.normalizedRecords,
              ),
            )
          }
          disabled={!canExportClassifications}
        >
          Export classifications CSV
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() =>
            downloadCsv(
              "validation-sample-10-percent.csv",
              validationSampleToCsv(
                pipeline.classifications,
                pipeline.normalizedRecords,
              ),
            )
          }
          disabled={!canExportClassifications}
        >
          Export 10% validation sample CSV
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => inputRef.current?.click()}
        >
          <FileJson className="mr-1 inline h-3 w-3" /> Import existing JSON
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importJson}
      />
    </section>
  );
}

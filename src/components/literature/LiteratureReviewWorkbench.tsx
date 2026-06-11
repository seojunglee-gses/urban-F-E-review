"use client";

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Layers,
  ListFilter,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
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

import {
  classificationsToCsv,
  downloadCsv,
  downloadJson,
  parseImportedJson,
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
  "rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm";
const innerClass = "rounded-2xl border border-slate-200 bg-slate-50 p-4";
const primaryButtonClass =
  "rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50";
const badgeClass =
  "text-xs font-semibold uppercase tracking-[0.3em] text-slate-400";
const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[var(--primary)]";
const chartPalette = ["#0f172a", "#334155", "#475569", "#64748b", "#94a3b8"];

type MainTab = "map" | "charts" | "gaps";
type DetailTab =
  | "records"
  | "topics"
  | "codebook"
  | "classifications"
  | "exports";

interface LocationPoint {
  name: string;
  count: number;
  x: number;
  y: number;
}

const locationCoordinates: Record<string, { x: number; y: number }> = {
  "United States": { x: 18, y: 43 },
  USA: { x: 18, y: 43 },
  Canada: { x: 17, y: 32 },
  Brazil: { x: 32, y: 70 },
  "United Kingdom": { x: 46, y: 35 },
  UK: { x: 46, y: 35 },
  France: { x: 48, y: 41 },
  Germany: { x: 50, y: 38 },
  Italy: { x: 51, y: 46 },
  Spain: { x: 46, y: 47 },
  Greece: { x: 55, y: 49 },
  Finland: { x: 53, y: 25 },
  Sweden: { x: 52, y: 27 },
  China: { x: 73, y: 44 },
  Japan: { x: 82, y: 45 },
  Singapore: { x: 70, y: 65 },
  India: { x: 65, y: 57 },
  Australia: { x: 80, y: 78 },
  "South Africa": { x: 53, y: 78 },
};

const countEntries = (
  counts: Record<string, number>,
): Array<{ name: string; value: number }> =>
  Object.entries(counts)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, value]) => ({ name, value }));

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

export default function LiteratureReviewWorkbench() {
  const pipeline = useLiteraturePipeline();
  const [mainTab, setMainTab] = useState<MainTab>("map");
  const [detailTab, setDetailTab] = useState<DetailTab>("records");

  return (
    <div className="space-y-5 bg-[var(--background)] text-[var(--foreground)]">
      <SearchConfigPanel pipeline={pipeline} />

      <PipelineStatusBar runState={pipeline.runState} />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className={cardClass}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className={badgeClass}>Evidence geography</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                도시별 논문 분포
              </h2>
            </div>
            <TabButtons
              tabs={[
                { id: "map", label: "Map" },
                { id: "charts", label: "Charts" },
                { id: "gaps", label: "Gaps" },
              ]}
              activeTab={mainTab}
              onChange={setMainTab}
            />
          </div>
          <div className="mt-4">
            {mainTab === "map" && <CityDistributionMap pipeline={pipeline} />}
            {mainTab === "charts" && (
              <EvidenceMapDashboard pipeline={pipeline} compact />
            )}
            {mainTab === "gaps" && <ResearchGapsPanel pipeline={pipeline} />}
          </div>
        </div>

        <div className="space-y-5">
          <SummaryPanel pipeline={pipeline} />
          <WosRetrievalPanel pipeline={pipeline} />
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className={badgeClass}>Workbench details</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">
              필요한 내용만 탭으로 확인
            </h2>
          </div>
          <TabButtons
            tabs={[
              { id: "records", label: "Records" },
              { id: "topics", label: "Topics" },
              { id: "codebook", label: "Codebook" },
              { id: "classifications", label: "Classifications" },
              { id: "exports", label: "Exports" },
            ]}
            activeTab={detailTab}
            onChange={setDetailTab}
          />
        </div>
        <div className="mt-4">
          {detailTab === "records" && (
            <RecordsPreviewTable pipeline={pipeline} />
          )}
          {detailTab === "topics" && <TopicModelingPanel pipeline={pipeline} />}
          {detailTab === "codebook" && (
            <GeneratedCodebookPanel pipeline={pipeline} />
          )}
          {detailTab === "classifications" && (
            <ClassificationPanel pipeline={pipeline} />
          )}
          {detailTab === "exports" && <ExportPanel pipeline={pipeline} />}
        </div>
      </section>
    </div>
  );
}

function TabButtons<TTab extends string>({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: Array<{ id: TTab; label: string }>;
  activeTab: TTab;
  onChange: (tab: TTab) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            activeTab === tab.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
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
  ): void => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    pipeline.setSearchConfig(next);
  };

  return (
    <header className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className={badgeClass}>Urban Form & Energy Evidence Map</p>
            <StatusPill
              label={
                pipeline.mockWos || pipeline.mockLlm ? "Mock mode" : "Live mode"
              }
              tone={pipeline.mockWos || pipeline.mockLlm ? "amber" : "slate"}
            />
            <StatusPill label={`${pipeline.records.length} records`} />
            <StatusPill
              label={`${pipeline.classifications.length} classified`}
            />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">
            {process.env.NEXT_PUBLIC_APP_NAME ??
              "Urban Form & Energy Evidence Map"}
          </h1>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_120px_120px_130px]">
            <label className="block">
              <span className="sr-only">Search query</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  className={`${inputClass} pl-9`}
                  value={draft.query}
                  onChange={(event) => updateDraft("query", event.target.value)}
                  placeholder='TS=(("urban form" AND energy) OR ...)'
                />
              </div>
            </label>
            <NumberInput
              label="Start"
              value={draft.yearStart}
              onChange={(value) => updateDraft("yearStart", value)}
            />
            <NumberInput
              label="End"
              value={draft.yearEnd}
              onChange={(value) => updateDraft("yearEnd", value)}
            />
            <NumberInput
              label="Max"
              value={draft.count}
              onChange={(value) => updateDraft("count", value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={pipeline.runSearch}
            disabled={pipeline.runState.retrieve.status === "running"}
          >
            Run Web of Science Search
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={pipeline.resetPipeline}
          >
            Reset
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>
          {pipeline.apiKeyDetected === false
            ? "Missing WOS_API_KEY"
            : pipeline.apiKeyDetected
              ? "Server API key detected"
              : "API key checked after search"}
        </span>
        <span>·</span>
        <span>2010–2025 · English · abstracts only</span>
      </div>
      <div className="mt-3">
        <ErrorBox message={pipeline.runState.retrieve.error} />
      </div>
    </header>
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
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      <input
        className={inputClass}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function PipelineStatusBar({ runState }: { runState: PipelineRunState }) {
  const stages: Array<{ key: keyof PipelineRunState; label: string }> = [
    { key: "retrieve", label: "Search" },
    { key: "normalize", label: "Normalize" },
    { key: "topics", label: "Topics" },
    { key: "codebook", label: "Codebook" },
    { key: "classify", label: "Classify" },
    { key: "map", label: "Map" },
  ];

  return (
    <section className="rounded-3xl border border-[var(--border)] bg-white p-3 shadow-sm">
      <div className="grid gap-2 md:grid-cols-6">
        {stages.map((stage) => (
          <div
            key={stage.key}
            className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2"
          >
            <StageIcon status={runState[stage.key].status} />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-700">
                {stage.label}
              </p>
              <p className="text-[11px] capitalize text-slate-400">
                {runState[stage.key].status} · {runState[stage.key].count}
              </p>
            </div>
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
  return <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />;
}

function SummaryPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const lowConfidence =
    pipeline.evidenceMap?.lowConfidenceRecordIds.length ?? 0;
  return (
    <section className={cardClass}>
      <p className={badgeClass}>Snapshot</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Retrieved" value={pipeline.records.length} />
        <Metric label="Normalized" value={pipeline.normalizedRecords.length} />
        <Metric
          label="Topics"
          value={pipeline.topicModel?.clusters.length ?? 0}
        />
        <Metric label="Low confidence" value={lowConfidence} />
      </div>
    </section>
  );
}

function WosRetrievalPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={badgeClass}>Next action</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Pipeline controls
          </h2>
        </div>
        <Database className="h-5 w-5 text-slate-400" />
      </div>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.normalizeRecords}
          disabled={pipeline.records.length === 0}
        >
          Normalize abstracts
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.runTopicModeling}
          disabled={
            pipeline.normalizedRecords.length === 0 ||
            pipeline.runState.topics.status === "running"
          }
        >
          Run topic modeling
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.generateCodebook}
          disabled={
            !pipeline.topicModel ||
            pipeline.runState.codebook.status === "running"
          }
        >
          Generate codebook
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.classifyRecords}
          disabled={
            !pipeline.codebook ||
            pipeline.runState.classify.status === "running"
          }
        >
          Classify evidence
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {[
          pipeline.runState.normalize.error,
          pipeline.runState.topics.error,
          pipeline.runState.codebook.error,
          pipeline.runState.classify.error,
        ]
          .filter(Boolean)
          .map((message) => (
            <ErrorBox key={message} message={message} />
          ))}
        {pipeline.warnings.slice(-2).map((warning) => (
          <div
            key={warning}
            className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"
          >
            {warning}
          </div>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function CityDistributionMap({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const points = useMemo(() => buildLocationPoints(pipeline), [pipeline]);
  const maxCount = Math.max(1, ...points.map((point) => point.count));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="relative min-h-[460px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
        <div className="absolute inset-4 rounded-[2rem] border border-dashed border-slate-300 bg-[radial-gradient(circle_at_20%_30%,#e2e8f0,transparent_24%),radial-gradient(circle_at_70%_45%,#cbd5e1,transparent_28%),radial-gradient(circle_at_50%_75%,#e2e8f0,transparent_22%)]" />
        <div className="absolute left-6 top-5 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          Extracted locations · GHSL join pending
        </div>
        {points.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
            <p className="max-w-sm text-sm text-slate-500">
              Run search and classification to plot city/country evidence
              distribution.
            </p>
          </div>
        ) : (
          points.map((point) => {
            const size = 18 + (point.count / maxCount) * 28;
            return (
              <button
                key={point.name}
                type="button"
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-slate-900/80 text-[10px] font-semibold text-white shadow-lg transition hover:scale-110"
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  width: size,
                  height: size,
                }}
                title={`${point.name}: ${point.count}`}
              >
                {point.count}
              </button>
            );
          })
        )}
      </div>
      <div className={innerClass}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">
            Top locations
          </h3>
        </div>
        <div className="mt-3 space-y-2">
          {points.length === 0 ? (
            <p className="text-sm text-slate-500">No locations yet.</p>
          ) : (
            points.slice(0, 10).map((point) => (
              <div
                key={point.name}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="font-semibold text-slate-700">
                  {point.name}
                </span>
                <span className="text-slate-500">{point.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function buildLocationPoints(
  pipeline: LiteraturePipelineController,
): LocationPoint[] {
  const counts =
    pipeline.evidenceMap?.geographyCounts ??
    buildPreClassificationLocationCounts(pipeline);
  return countEntries(counts)
    .slice(0, 18)
    .map((entry, index) => {
      const coordinate = locationCoordinates[entry.name] ?? {
        x: 18 + ((index * 17) % 68),
        y: 25 + ((index * 13) % 55),
      };
      return { name: entry.name, count: entry.value, ...coordinate };
    });
}

function buildPreClassificationLocationCounts(
  pipeline: LiteraturePipelineController,
): Record<string, number> {
  const counts: Record<string, number> = {};
  const locations =
    pipeline.normalizedRecords.length > 0
      ? pipeline.normalizedRecords.flatMap(
          (record) => record.candidateLocations,
        )
      : pipeline.records.flatMap((record) => record.countries);
  locations.forEach((location) => {
    const key = location.trim();
    if (key) counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}

function EvidenceMapDashboard({
  pipeline,
  compact = false,
}: {
  pipeline: LiteraturePipelineController;
  compact?: boolean;
}) {
  const summary = pipeline.evidenceMap;
  const [selectedCell, setSelectedCell] = useState<EvidenceMatrixCell | null>(
    null,
  );
  const recordById = new Map(
    pipeline.normalizedRecords.map((record) => [record.id, record]),
  );

  if (!summary) {
    return <EmptyState>Classify records to show charts and matrix.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="Total" value={summary.totalRecords} />
          <Metric label="Included" value={summary.includedRecords} />
          <Metric
            label="Topics"
            value={pipeline.topicModel?.clusters.length ?? 0}
          />
          <Metric label="Classified" value={pipeline.classifications.length} />
          <Metric
            label="Low conf."
            value={summary.lowConfidenceRecordIds.length}
          />
        </div>
      )}
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
      <div className="grid gap-4 lg:grid-cols-2">
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
    </div>
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-800">
          Urban form × energy outcome
        </h3>
        <Layers className="h-4 w-4 text-slate-400" />
      </div>
      <div className="overflow-x-auto">
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
        <p className="mt-3 text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ left: 0, right: 8, top: 8, bottom: 40 }}
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
      <p className="mt-1 text-xs text-slate-500">
        GHSL join pending · extracted locations
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
      <div className="flex items-center gap-2">
        <ListFilter className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Research gaps</h3>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {gaps.length === 0 ? (
          <p className="text-sm text-slate-500">
            Classify records to compute gap statements.
          </p>
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
      `${record.title} ${record.journal}`.toLowerCase().includes(needle),
    );
  }, [filter, source]);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          className={`${inputClass} md:max-w-xs`}
          placeholder="Filter records"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.normalizeRecords}
          disabled={pipeline.records.length === 0}
        >
          Normalize records
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        {rows.length === 0 ? (
          <div className="bg-slate-50 p-4 text-sm text-slate-500">
            Run Web of Science search first.
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
              {rows.slice(0, 30).map((record) => (
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
    </div>
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
    <div className="space-y-3">
      <button
        type="button"
        className={secondaryButtonClass}
        onClick={pipeline.runTopicModeling}
        disabled={
          pipeline.normalizedRecords.length === 0 ||
          pipeline.runState.topics.status === "running"
        }
      >
        <Sparkles className="mr-1 inline h-3 w-3" /> Run LLM Topic Modeling
      </button>
      <ErrorBox message={pipeline.runState.topics.error} />
      {!pipeline.topicModel ? (
        <EmptyState>Normalize abstracts, then discover topics.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pipeline.topicModel.clusters.map((cluster) => (
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
                {cluster.keywords.join(", ")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-500">
                {cluster.representativeRecordIds.slice(0, 2).map((id) => (
                  <li key={id}>{recordTitleById.get(id) ?? id}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function GeneratedCodebookPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  return (
    <div className="space-y-3">
      <button
        type="button"
        className={secondaryButtonClass}
        onClick={pipeline.generateCodebook}
        disabled={
          !pipeline.topicModel ||
          pipeline.runState.codebook.status === "running"
        }
      >
        <BookOpen className="mr-1 inline h-3 w-3" /> Generate Draft Codebook
      </button>
      <ErrorBox message={pipeline.runState.codebook.error} />
      {!pipeline.codebook ? (
        <EmptyState>
          Run topic modeling, then generate a draft codebook.
        </EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {pipeline.codebook.dimensions.map((dimension) => (
            <CodebookDimensionView key={dimension.id} dimension={dimension} />
          ))}
        </div>
      )}
    </div>
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
        {dimension.name} · {dimension.categories.length}
      </summary>
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
    <div className="space-y-3">
      <button
        type="button"
        className={primaryButtonClass}
        onClick={pipeline.classifyRecords}
        disabled={
          !pipeline.codebook || pipeline.runState.classify.status === "running"
        }
      >
        Classify Abstracts
      </button>
      <ErrorBox message={pipeline.runState.classify.error} />
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
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
                <th className="px-4 py-3">Method</th>
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
    </div>
  );
}

function ClassificationRow({
  classification,
  record,
}: {
  classification: LLMClassification;
  record?: NormalizedAbstractRecord;
}) {
  return (
    <tr
      className={classification.confidence < 0.6 ? "bg-amber-50/70" : undefined}
    >
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
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
          <FileJson className="mr-1 inline h-3 w-3" /> Import JSON
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={importJson}
      />
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Download className="h-3 w-3" /> Export review artifacts for downstream
        analysis.
      </div>
    </div>
  );
}

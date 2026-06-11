import { findCityCoordinate } from "../../lib/geo/cityCoordinates";
import type { EvidenceMapSummary } from "../../types/literature";
import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";

export const cardClass =
  "rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm";
export const compactCardClass =
  "rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm";
export const innerClass = "rounded-2xl border border-slate-200 bg-slate-50 p-4";
export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50";
export const tabButtonBaseClass =
  "rounded-full px-3 py-1.5 text-xs font-semibold transition";
export const badgeClass =
  "text-xs font-semibold uppercase tracking-[0.3em] text-slate-400";
export const inputClass =
  "w-full rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--primary)]";
export const panelTitleClass = "text-lg font-semibold text-slate-900";
export const descriptionClass = "text-sm text-slate-500";
export const chartPalette = [
  "#0f172a",
  "#334155",
  "#475569",
  "#64748b",
  "#94a3b8",
];

export interface CountEntry {
  name: string;
  value: number;
}

export interface CityEvidencePoint {
  city: string;
  country: string;
  count: number;
  x: number;
  y: number;
  topTopic: string;
}

export const countEntries = (counts: Record<string, number>): CountEntry[] =>
  Object.entries(counts)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, value]) => ({ name, value }));

const increment = (counts: Record<string, number>, key: string): void => {
  const cleanKey = key.trim();
  if (cleanKey) counts[cleanKey] = (counts[cleanKey] ?? 0) + 1;
};

export const buildCityEvidencePoints = (
  pipeline: LiteraturePipelineController,
): CityEvidencePoint[] => {
  const counts: Record<string, number> = {};
  const topicByRecord = new Map<string, string>();

  pipeline.topicModel?.clusters.forEach((cluster) => {
    cluster.representativeRecordIds.forEach((recordId) => {
      topicByRecord.set(recordId, cluster.label);
    });
  });

  if (pipeline.classifications.length > 0) {
    pipeline.classifications.forEach((classification) => {
      classification.geography.forEach((location) =>
        increment(counts, location),
      );
    });
  } else if (pipeline.normalizedRecords.length > 0) {
    pipeline.normalizedRecords.forEach((record) => {
      record.candidateLocations.forEach((location) =>
        increment(counts, location),
      );
    });
  } else {
    pipeline.records.forEach((record) => {
      record.countries.forEach((location) => increment(counts, location));
    });
  }

  return countEntries(counts)
    .slice(0, 24)
    .map((entry, index) => {
      const coordinate = findCityCoordinate(entry.name) ?? {
        city: entry.name,
        country: entry.name,
        x: 16 + ((index * 19) % 68),
        y: 26 + ((index * 13) % 54),
      };
      return {
        city: coordinate.city,
        country: coordinate.country,
        count: entry.value,
        x: coordinate.x,
        y: coordinate.y,
        topTopic: pipeline.topicModel?.clusters[0]?.label ?? "Topic pending",
      };
    });
};

export const getRecordTitle = (
  pipeline: LiteraturePipelineController,
  recordId: string,
): string =>
  pipeline.normalizedRecords.find((record) => record.id === recordId)?.title ??
  recordId;

export const getSummaryOrEmpty = (
  evidenceMap: EvidenceMapSummary | null,
): EvidenceMapSummary | null => evidenceMap;

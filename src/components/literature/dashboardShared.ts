import type { CountValue } from "../../types/review";

export const majorCard = "rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm";
export const innerPanel = "rounded-2xl border border-slate-200 bg-slate-50 p-4";
export const primaryButton = "rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryButton = "rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50";
export const titleText = "text-lg font-semibold text-slate-900";
export const descriptionText = "text-sm text-slate-500";
export const badgeText = "text-xs font-semibold uppercase tracking-[0.3em] text-slate-400";

export const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

export const topItems = (items: CountValue[], limit = 5): CountValue[] => items.slice(0, limit);

// Compatibility aliases for legacy, unused topic-card module kept in the repository.
export const innerClass = innerPanel;
export const secondaryButtonClass = `${secondaryButton} inline-flex items-center gap-2`;
export const getRecordTitle = (
  pipeline: { normalizedRecords?: Array<{ id: string; title: string }> },
  recordId: string,
): string => pipeline.normalizedRecords?.find((record) => record.id === recordId)?.title ?? recordId;

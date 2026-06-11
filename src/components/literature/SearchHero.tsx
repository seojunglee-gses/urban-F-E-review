import { ChevronDown, PlayCircle, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import type { WosSearchConfig } from "../../types/literature";
import {
  cardClass,
  descriptionClass,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./dashboardShared";

const readableQuery = (query: string): string =>
  query
    .replace(/^TS=\(/, "")
    .replace(/\)\s+AND\s+LA=\(English\)$/i, "")
    .trim();

const toWosQuery = (query: string): string => {
  const trimmed = query.trim();
  if (trimmed.startsWith("TS=")) return trimmed;
  return `TS=(${trimmed}) AND LA=(English)`;
};

export function SearchHero({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const [draft, setDraft] = useState<WosSearchConfig>(pipeline.searchConfig);
  const [queryText, setQueryText] = useState(
    readableQuery(pipeline.searchConfig.query),
  );
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setDraft(pipeline.searchConfig);
    setQueryText(readableQuery(pipeline.searchConfig.query));
  }, [pipeline.searchConfig]);

  const missingKey =
    pipeline.apiKeyDetected === false ||
    pipeline.runState.retrieve.error?.includes("Missing WOS_API_KEY");
  const isSearching = pipeline.runState.retrieve.status === "running";
  const canShowDemoHint = useMemo(
    () => pipeline.records.length === 0,
    [pipeline.records.length],
  );

  const updateDraft = <TKey extends keyof WosSearchConfig>(
    key: TKey,
    value: WosSearchConfig[TKey],
  ): void => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    pipeline.setSearchConfig(next);
  };

  const updateQuery = (value: string): void => {
    setQueryText(value);
    updateDraft("query", toWosQuery(value));
  };

  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Search keywords
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} h-12 pl-11 text-base`}
                value={queryText}
                onChange={(event) => updateQuery(event.target.value)}
                placeholder='("urban form" AND energy) OR ("urban heat island" AND energy)'
              />
            </div>
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-[310px]">
          <CompactNumber
            label="From"
            value={draft.yearStart}
            onChange={(value) => updateDraft("yearStart", value)}
          />
          <CompactNumber
            label="To"
            value={draft.yearEnd}
            onChange={(value) => updateDraft("yearEnd", value)}
          />
          <CompactNumber
            label="Max"
            value={draft.count}
            onChange={(value) => updateDraft("count", value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={pipeline.runSearch}
            disabled={isSearching}
          >
            <Search className="h-4 w-4" /> Search Web of Science
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={pipeline.runDemo}
          >
            <PlayCircle className="h-3.5 w-3.5" /> Run demo
          </button>
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={pipeline.resetPipeline}
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-5">
          {missingKey ? (
            <p className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Live Web of Science key is missing. Use demo mode or add
              WOS_API_KEY.
            </p>
          ) : canShowDemoHint ? (
            <p className={descriptionClass}>
              Run a live search or start with demo data.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
          onClick={() => setAdvancedOpen((current) => !current)}
        >
          Advanced settings{" "}
          <ChevronDown
            className={`h-3.5 w-3.5 transition ${advancedOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {advancedOpen && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
            Raw WoS query
          </p>
          <textarea
            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600 outline-none focus:border-[var(--primary)]"
            value={draft.query}
            onChange={(event) => updateDraft("query", event.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span>Language: English</span>
            <span>·</span>
            <span>Source types: articles/reviews where available</span>
            <span>·</span>
            <span>Abstract-based screening</span>
          </div>
        </div>
      )}

      {pipeline.runState.retrieve.error && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {pipeline.runState.retrieve.error}
        </div>
      )}
    </section>
  );
}

function CompactNumber({
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
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>
      <input
        type="number"
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--primary)]"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

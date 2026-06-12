import { Search } from "lucide-react";

import type { ReviewProgressStep } from "../../hooks/useReviewPipeline";
import { badgeText, majorCard, primaryButton, secondaryButton } from "./dashboardShared";

interface SearchHeroProps {
  query: string;
  setQuery: (value: string) => void;
  isRunning: boolean;
  error: string | null;
  steps: ReviewProgressStep[];
  onRun: () => void;
  onReset: () => void;
}

const stepClasses: Record<ReviewProgressStep["status"], string> = {
  idle: "border-slate-200 bg-white text-slate-400",
  running: "border-amber-200 bg-amber-50 text-amber-700",
  complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export const SearchHero = ({ query, setQuery, isRunning, error, steps, onRun, onReset }: SearchHeroProps) => (
  <section className={`${majorCard} space-y-4`}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
      <label className="flex-1">
        <span className={badgeText}>Research topic or question</span>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-[var(--primary)] focus-within:bg-white">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="urban form and building energy consumption"
          />
        </div>
      </label>
      <div className="flex gap-2">
        <button className={primaryButton} disabled={isRunning || query.trim().length < 2} onClick={onRun} type="button">
          {isRunning ? "Running review…" : "Run Review"}
        </button>
        <button className={secondaryButton} disabled={isRunning} onClick={onReset} type="button">Reset</button>
      </div>
    </div>

    <div className="flex flex-wrap gap-2">
      {steps.map((step) => (
        <span key={step.label} className={`rounded-full border px-3 py-1 text-xs font-semibold ${stepClasses[step.status]}`}>{step.label}</span>
      ))}
    </div>

    {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{error}</div> : null}
  </section>
);

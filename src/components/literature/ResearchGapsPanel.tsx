import { ListFilter } from "lucide-react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import { innerClass } from "./dashboardShared";

export function ResearchGapsPanel({
  pipeline,
  limit,
  compact = false,
}: {
  pipeline: LiteraturePipelineController;
  limit?: number;
  compact?: boolean;
}) {
  const gaps = pipeline.evidenceMap?.researchGaps ?? [];
  const visibleGaps = limit ? gaps.slice(0, limit) : gaps;

  return (
    <section className={innerClass}>
      <div className="flex items-center gap-2">
        <ListFilter className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">
          {compact ? "Main research gaps" : "Research gaps"}
        </h3>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {visibleGaps.length === 0 ? (
          <p className="text-sm text-slate-500">
            Run demo or classify records to compute gap statements.
          </p>
        ) : (
          visibleGaps.map((gap) => (
            <div
              key={gap.id}
              className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {gap.severity}
              </span>
              <p className="mt-1 leading-5">{gap.statement}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

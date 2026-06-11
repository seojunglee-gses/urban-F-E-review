import { BarChart3, MapPin } from "lucide-react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import {
  buildCityEvidencePoints,
  countEntries,
  innerClass,
} from "./dashboardShared";
import { ResearchGapsPanel } from "./ResearchGapsPanel";

export function InsightSidebar({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const cityPoints = buildCityEvidencePoints(pipeline);
  const maxCityCount = Math.max(1, ...cityPoints.map((point) => point.count));
  const topicData = pipeline.evidenceMap
    ? countEntries(pipeline.evidenceMap.topicCounts).slice(0, 4)
    : [];

  return (
    <aside className="flex flex-col gap-5">
      <section className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
          Insights
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <InsightMetric
            label="Retrieved papers"
            value={pipeline.records.length}
          />
          <InsightMetric
            label="Included abstracts"
            value={
              pipeline.evidenceMap?.includedRecords ??
              pipeline.normalizedRecords.length
            }
          />
          <InsightMetric
            label="Topics"
            value={pipeline.topicModel?.clusters.length ?? 0}
          />
          <InsightMetric label="Cities" value={cityPoints.length} />
        </div>
      </section>

      <section className={innerClass}>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Top cities</h3>
        </div>
        <div className="mt-3 space-y-3">
          {cityPoints.length === 0 ? (
            <p className="text-sm text-slate-500">No city evidence yet.</p>
          ) : (
            cityPoints.slice(0, 6).map((point) => (
              <div key={`${point.city}-${point.country}`}>
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>{point.city}</span>
                  <span>{point.count}</span>
                </div>
                <div className="h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-slate-700"
                    style={{
                      width: `${Math.max(8, (point.count / maxCityCount) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={innerClass}>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">
            Topic snapshot
          </h3>
        </div>
        <div className="mt-3 space-y-2">
          {topicData.length === 0 ? (
            <p className="text-sm text-slate-500">
              Run demo or topic modeling.
            </p>
          ) : (
            topicData.map((topic) => (
              <div
                key={topic.name}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
              >
                <span className="max-w-[220px] truncate font-semibold text-slate-700">
                  {topic.name}
                </span>
                <span className="text-slate-500">{topic.value}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <ResearchGapsPanel pipeline={pipeline} limit={5} compact />
    </aside>
  );
}

function InsightMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

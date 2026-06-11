import { Sparkles } from "lucide-react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import {
  getRecordTitle,
  innerClass,
  secondaryButtonClass,
} from "./dashboardShared";

export function TopicCards({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
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
        <Sparkles className="h-3.5 w-3.5" /> Discover topics
      </button>
      {pipeline.runState.topics.error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {pipeline.runState.topics.error}
        </div>
      )}
      {!pipeline.topicModel ? (
        <div className={innerClass}>
          <p className="text-sm text-slate-500">
            Normalize records, then discover topics.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pipeline.topicModel.clusters.map((cluster) => (
            <article key={cluster.id} className={innerClass}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  {cluster.label}
                </h3>
                <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500">
                  {Math.round(cluster.confidence * 100)}%
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {cluster.description}
              </p>
              <p className="mt-3 text-xs font-semibold text-slate-600">
                {cluster.keywords.slice(0, 6).join(" · ")}
              </p>
              <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-500">
                {cluster.representativeRecordIds.slice(0, 3).map((recordId) => (
                  <li key={recordId}>{getRecordTitle(pipeline, recordId)}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

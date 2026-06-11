import { BookOpen } from "lucide-react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import type { CodebookDimension } from "../../types/literature";
import { innerClass, secondaryButtonClass } from "./dashboardShared";

export function CodebookView({
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
        <BookOpen className="h-3.5 w-3.5" /> Generate codebook
      </button>
      {pipeline.runState.codebook.error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {pipeline.runState.codebook.error}
        </div>
      )}
      {!pipeline.codebook ? (
        <div className={innerClass}>
          <p className="text-sm text-slate-500">
            Discover topics, then generate a draft codebook.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pipeline.codebook.dimensions.map((dimension) => (
            <CodebookDimensionCard key={dimension.id} dimension={dimension} />
          ))}
        </div>
      )}
    </div>
  );
}

function CodebookDimensionCard({
  dimension,
}: {
  dimension: CodebookDimension;
}) {
  return (
    <details className={innerClass}>
      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
        {dimension.name} · {dimension.categories.length} categories
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        {dimension.categories.map((category) => (
          <span
            key={category.id}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
          >
            {category.label}
          </span>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {dimension.categories.slice(0, 6).map((category) => (
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

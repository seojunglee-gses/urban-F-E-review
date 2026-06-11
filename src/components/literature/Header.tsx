import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import { badgeClass, descriptionClass } from "./dashboardShared";

const StatusBadge = ({
  children,
  tone = "slate",
}: {
  children: string;
  tone?: "slate" | "amber";
}) => (
  <span
    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
      tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-slate-200 bg-white text-slate-600"
    }`}
  >
    {children}
  </span>
);

export function Header({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const isMock = pipeline.mockWos || pipeline.mockLlm;
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={badgeClass}>Research dashboard</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          Urban Form & Energy Evidence Map
        </h1>
        <p className={`mt-2 ${descriptionClass}`}>
          Search literature, map city-level evidence, and identify research
          gaps.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={isMock ? "amber" : "slate"}>
          {isMock ? "Mock data" : "Live WoS"}
        </StatusBadge>
        <StatusBadge>{`${pipeline.records.length} records`}</StatusBadge>
        <StatusBadge>{`${pipeline.classifications.length} classified`}</StatusBadge>
      </div>
    </header>
  );
}

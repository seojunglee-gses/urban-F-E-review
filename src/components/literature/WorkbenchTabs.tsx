import { useState } from "react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import { CodebookView } from "./CodebookView";
import {
  compactCardClass,
  primaryButtonClass,
  tabButtonBaseClass,
} from "./dashboardShared";
import { EvidenceChartsPanel } from "./EvidenceChartsPanel";
import { EvidenceMatrix } from "./EvidenceMatrix";
import { ExportPanel } from "./ExportPanel";
import { RecordsTable } from "./RecordsTable";
import { ResearchGapsPanel } from "./ResearchGapsPanel";
import { TopicCards } from "./TopicCards";

type WorkbenchTab =
  | "overview"
  | "matrix"
  | "topics"
  | "codebook"
  | "records"
  | "exports";

const tabs: Array<{ id: WorkbenchTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "matrix", label: "Evidence Matrix" },
  { id: "topics", label: "Topics" },
  { id: "codebook", label: "Codebook" },
  { id: "records", label: "Records" },
  { id: "exports", label: "Exports" },
];

export function WorkbenchTabs({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("overview");

  return (
    <section className={compactCardClass}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${tabButtonBaseClass} ${activeTab === tab.id ? "bg-[var(--primary)] text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryButtonClass}
            onClick={pipeline.runDemo}
          >
            Run demo
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[var(--primary)]"
            onClick={pipeline.classifyRecords}
            disabled={!pipeline.codebook}
          >
            Map evidence
          </button>
        </div>
      </div>

      <div className="mt-5">
        {activeTab === "overview" && <OverviewTab pipeline={pipeline} />}
        {activeTab === "matrix" && <MatrixTab pipeline={pipeline} />}
        {activeTab === "topics" && <TopicCards pipeline={pipeline} />}
        {activeTab === "codebook" && <CodebookView pipeline={pipeline} />}
        {activeTab === "records" && <RecordsTable pipeline={pipeline} />}
        {activeTab === "exports" && <ExportPanel pipeline={pipeline} />}
      </div>
    </section>
  );
}

function OverviewTab({ pipeline }: { pipeline: LiteraturePipelineController }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          This dashboard summarizes where urban form and energy evidence is
          concentrated across cities, methods, scales, and topics. Use the
          matrix tab to inspect strong and sparse evidence cells.
        </p>
      </div>
      <EvidenceChartsPanel pipeline={pipeline} />
    </div>
  );
}

function MatrixTab({ pipeline }: { pipeline: LiteraturePipelineController }) {
  return (
    <div className="space-y-4">
      <EvidenceMatrix pipeline={pipeline} />
      <ResearchGapsPanel pipeline={pipeline} />
    </div>
  );
}

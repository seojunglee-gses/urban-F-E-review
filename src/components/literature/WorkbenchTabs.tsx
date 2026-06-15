import { useState } from "react";

import type { ReviewRunResponse } from "../../types/review";
import { EvidenceChartsPanel } from "./EvidenceChartsPanel";
import { EvidenceMatrix } from "./EvidenceMatrix";
import { ExportPanel } from "./ExportPanel";
import { majorCard, primaryButton, secondaryButton } from "./dashboardShared";
import { RecordsTable } from "./RecordsTable";

interface WorkbenchTabsProps {
  result: ReviewRunResponse | null;
}

type TabId = "overview" | "matrix" | "records" | "exports";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "matrix", label: "Evidence Matrix" },
  { id: "records", label: "Evidence Table" },
  { id: "exports", label: "Exports" },
];

export const WorkbenchTabs = ({ result }: WorkbenchTabsProps) => {
  const [active, setActive] = useState<TabId>("overview");
  const renderTab = () => {
    if (active === "overview") return <EvidenceChartsPanel chartData={result?.chartData ?? null} />;
    if (active === "matrix") return <EvidenceMatrix codedPapers={result?.codedPapers ?? []} />;
    if (active === "records") return <RecordsTable papers={result?.papers ?? []} codedPapers={result?.codedPapers ?? []} />;
    return <ExportPanel result={result} />;
  };
  return (
    <section className={majorCard}>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button key={tab.id} className={active === tab.id ? primaryButton : secondaryButton} type="button" onClick={() => setActive(tab.id)}>{tab.label}</button>
        ))}
      </div>
      {renderTab()}
    </section>
  );
};

import { useMemo, useState } from "react";

import type { CodedPaper, Paper } from "../../types/review";
import { descriptionText, titleText } from "./dashboardShared";

interface RecordsTableProps {
  papers: Paper[];
  codedPapers: CodedPaper[];
}

export const RecordsTable = ({ papers, codedPapers }: RecordsTableProps) => {
  const [filter, setFilter] = useState("");
  const codedById = useMemo(() => new Map(codedPapers.map((coded) => [coded.paperId, coded])), [codedPapers]);
  const visible = papers.filter((paper) => `${paper.title} ${paper.journal ?? ""} ${paper.geoMention?.city ?? ""} ${paper.geoMention?.country ?? ""} ${paper.geoMention?.region ?? ""}`.toLowerCase().includes(filter.toLowerCase()));
  const formatStudyArea = (paper: Paper): string => [paper.geoMention?.city, paper.geoMention?.country, paper.geoMention?.region].filter(Boolean).join(", ") || paper.geoMention?.locationRole || "unknown";
  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className={titleText}>Evidence table</h2>
          <p className={descriptionText}>Papers stay visible even when LLM coding is unavailable.</p>
        </div>
        <input className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-[var(--primary)]" placeholder="Filter papers" value={filter} onChange={(event) => setFilter(event.target.value)} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-[980px] w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Journal</th>
              <th className="px-4 py-3">Study area</th>
              <th className="px-4 py-3">Urban form</th>
              <th className="px-4 py-3">Energy outcome</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {visible.map((paper) => {
              const coded = codedById.get(paper.id);
              return (
                <tr className={coded?.needsManualReview ? "bg-amber-50/60" : ""} key={paper.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{paper.title}</td>
                  <td className="px-4 py-3 text-slate-600">{paper.year ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{paper.journal ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatStudyArea(paper)}</td>
                  <td className="px-4 py-3 text-slate-600">{coded?.codes.urbanFormVariables.join(", ") || "pending"}</td>
                  <td className="px-4 py-3 text-slate-600">{coded?.codes.energyOutcomes.join(", ") || "pending"}</td>
                  <td className="px-4 py-3 text-slate-600">{coded?.codes.method ?? "pending"}</td>
                  <td className="px-4 py-3 text-slate-600">{coded ? `${Math.round(coded.confidence * 100)}%${coded.needsManualReview ? " · review" : ""}` : "not coded"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

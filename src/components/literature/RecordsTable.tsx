import { useMemo, useState } from "react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import { inputClass, secondaryButtonClass } from "./dashboardShared";

export function RecordsTable({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const [filter, setFilter] = useState("");
  const classificationById = useMemo(
    () =>
      new Map(
        pipeline.classifications.map((classification) => [
          classification.recordId,
          classification,
        ]),
      ),
    [pipeline.classifications],
  );
  const records =
    pipeline.normalizedRecords.length > 0
      ? pipeline.normalizedRecords
      : pipeline.records;
  const filtered = useMemo(() => {
    const needle = filter.toLowerCase();
    return records.filter((record) =>
      `${record.title} ${record.journal}`.toLowerCase().includes(needle),
    );
  }, [filter, records]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className={`${inputClass} sm:max-w-sm`}
          placeholder="Filter records"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={pipeline.normalizeRecords}
          disabled={pipeline.records.length === 0}
        >
          Normalize records
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        {filtered.length === 0 ? (
          <div className="bg-slate-50 p-4 text-sm text-slate-500">
            No records yet. Search Web of Science or run demo.
          </div>
        ) : (
          <table className="min-w-[1120px] divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Year</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">City/Country</th>
                <th className="px-4 py-3">Urban form</th>
                <th className="px-4 py-3">Energy outcome</th>
                <th className="px-4 py-3">Methodology</th>
                <th className="px-4 py-3">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-600">
              {filtered.slice(0, 80).map((record) => {
                const classification = classificationById.get(record.id);
                const locations =
                  "candidateLocations" in record
                    ? record.candidateLocations
                    : record.countries;
                return (
                  <tr key={record.id}>
                    <td className="max-w-sm px-4 py-3 font-semibold text-slate-800">
                      {record.title}
                    </td>
                    <td className="px-4 py-3">{record.year ?? "—"}</td>
                    <td className="px-4 py-3">{record.journal}</td>
                    <td className="px-4 py-3">{locations.join("; ") || "—"}</td>
                    <td className="px-4 py-3">
                      {classification?.urbanFormVariables.join("; ") ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {classification?.energyOutcomes.join("; ") ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {classification?.methodology ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {classification
                        ? `${Math.round(classification.confidence * 100)}%`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import type { EvidenceMatrixCell } from "../../types/literature";
import { getRecordTitle, innerClass } from "./dashboardShared";

export function EvidenceMatrix({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const matrix = pipeline.evidenceMap?.evidenceMatrix ?? [];
  const [selectedCell, setSelectedCell] = useState<EvidenceMatrixCell | null>(
    null,
  );
  const rows = useMemo(
    () =>
      Array.from(new Set(matrix.map((cell) => cell.urbanFormVariable))).sort(),
    [matrix],
  );
  const columns = useMemo(
    () => Array.from(new Set(matrix.map((cell) => cell.energyOutcome))).sort(),
    [matrix],
  );
  const byKey = useMemo(
    () =>
      new Map(
        matrix.map((cell) => [
          `${cell.urbanFormVariable}__${cell.energyOutcome}`,
          cell,
        ]),
      ),
    [matrix],
  );
  const maxCount = Math.max(1, ...matrix.map((cell) => cell.count));
  const sparse = matrix.filter((cell) => cell.count <= 1).slice(0, 6);
  const strong = [...matrix].sort((a, b) => b.count - a.count).slice(0, 6);

  if (matrix.length === 0) {
    return (
      <div className={innerClass}>
        <p className="text-sm text-slate-500">
          Run demo or classify records to build the evidence matrix.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={innerClass}>
        <div className="overflow-x-auto">
          <table className="min-w-[760px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-slate-200 bg-white p-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Urban form
                </th>
                {columns.map((column) => (
                  <th
                    key={column}
                    className="border border-slate-200 bg-white p-2 text-left text-xs font-semibold text-slate-500"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row}>
                  <th className="border border-slate-200 bg-white p-2 text-left font-semibold text-slate-700">
                    {row}
                  </th>
                  {columns.map((column) => {
                    const cell = byKey.get(`${row}__${column}`);
                    const intensity = cell
                      ? 0.12 + (cell.count / maxCount) * 0.5
                      : 0;
                    return (
                      <td
                        key={column}
                        className="border border-slate-200 bg-white p-2"
                      >
                        {cell ? (
                          <button
                            type="button"
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 hover:border-[var(--primary)]"
                            style={{
                              backgroundColor: `rgba(15, 23, 42, ${intensity})`,
                            }}
                            onClick={() => setSelectedCell(cell)}
                          >
                            {cell.count}
                          </button>
                        ) : (
                          <span className="block rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-300">
                            0
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCell && (
        <div className={innerClass}>
          <p className="text-sm font-semibold text-slate-800">
            {selectedCell.urbanFormVariable} × {selectedCell.energyOutcome}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-500">
            {selectedCell.recordIds.map((recordId) => (
              <li key={recordId}>{getRecordTitle(pipeline, recordId)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <CellList title="Sparse evidence cells" cells={sparse} />
        <CellList title="Strong evidence cells" cells={strong} />
      </div>
    </div>
  );
}

function CellList({
  title,
  cells,
}: {
  title: string;
  cells: EvidenceMatrixCell[];
}) {
  return (
    <div className={innerClass}>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-3 space-y-2">
        {cells.length === 0 ? (
          <p className="text-sm text-slate-500">No cells yet.</p>
        ) : (
          cells.map((cell) => (
            <div
              key={`${cell.urbanFormVariable}-${cell.energyOutcome}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <span className="text-slate-600">
                {cell.urbanFormVariable} × {cell.energyOutcome}
              </span>
              <span className="font-semibold text-slate-800">{cell.count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

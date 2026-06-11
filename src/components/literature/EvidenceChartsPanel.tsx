import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import {
  chartPalette,
  countEntries,
  innerClass,
  type CountEntry,
} from "./dashboardShared";

export function EvidenceChartsPanel({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const summary = pipeline.evidenceMap;
  if (!summary) {
    return (
      <div className={innerClass}>
        <p className="text-sm text-slate-500">
          Run demo or classify records to populate charts.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Records by year"
        data={countEntries(summary.yearCounts).sort((a, b) =>
          a.name.localeCompare(b.name),
        )}
      />
      <ChartCard
        title="Topic distribution"
        data={countEntries(summary.topicCounts)}
      />
      <ChartCard
        title="Methodology distribution"
        data={countEntries(summary.methodologyCounts)}
      />
      <ChartCard
        title="Scale distribution"
        data={countEntries(summary.scaleCounts)}
      />
      <ChartCard
        title="Relationship type"
        data={countEntries(summary.relationshipCounts)}
      />
      <ChartCard
        title="Geography distribution"
        data={countEntries(summary.geographyCounts).slice(0, 10)}
      />
    </div>
  );
}

function ChartCard({ title, data }: { title: string; data: CountEntry[] }) {
  return (
    <div className={innerClass}>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No chart data yet.</p>
      ) : (
        <div className="mt-3 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ left: 0, right: 8, top: 8, bottom: 44 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={chartPalette[index % chartPalette.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

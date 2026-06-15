import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ChartData, CountValue } from "../../types/review";
import { descriptionText, innerPanel, titleText } from "./dashboardShared";

interface EvidenceChartsPanelProps {
  chartData: ChartData | null;
}

const MiniBar = ({ title, data, limit = 8 }: { title: string; data: CountValue[]; limit?: number }) => (
  <div className={innerPanel}>
    <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
    {data.length ? (
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, limit)} margin={{ top: 8, right: 8, bottom: 28, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" angle={-25} interval={0} tick={{ fontSize: 10 }} textAnchor="end" />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#64748b" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <p className={`${descriptionText} mt-3`}>Run a review to populate this chart.</p>
    )}
  </div>
);

export const EvidenceChartsPanel = ({ chartData }: EvidenceChartsPanelProps) => (
  <section className="space-y-4">
    <div>
      <h2 className={titleText}>Evidence charts</h2>
      <p className={descriptionText}>Trends and distributions are computed from paper records, extracted study-area context, and coded evidence.</p>
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <MiniBar title="OpenAlex topic groups" data={chartData?.openAlexTopics ?? []} />
      <MiniBar title="Yearly publication trend" data={chartData?.yearlyTrend ?? []} limit={40} />
      <MiniBar title="Urban form variables" data={chartData?.urbanFormVariables ?? []} />
      <MiniBar title="Energy outcomes" data={chartData?.energyOutcomes ?? []} />
      <MiniBar title="Methods" data={chartData?.methods ?? []} />
      <MiniBar title="Study-area climate zones" data={chartData?.climateZones ?? []} />
      <MiniBar title="Income groups" data={chartData?.incomeGroups ?? []} />
      <MiniBar title="Study-area regions" data={chartData?.regions ?? []} />
      <MiniBar title="Study-area countries" data={chartData?.countries ?? []} />
      <MiniBar title="Study-area cities" data={chartData?.cities ?? []} />
    </div>
  </section>
);

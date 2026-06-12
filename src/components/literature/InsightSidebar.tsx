import type { ReviewRunResponse } from "../../types/review";
import { descriptionText, innerPanel, majorCard, titleText, topItems } from "./dashboardShared";
import { ResearchGapsPanel } from "./ResearchGapsPanel";

interface InsightSidebarProps {
  result: ReviewRunResponse | null;
}

export const InsightSidebar = ({ result }: InsightSidebarProps) => {
  const summary = result?.evidenceSummary;
  const countries = topItems(result?.chartData.countries ?? [], 5);
  const climateZones = topItems(result?.chartData.climateZones ?? [], 4);
  const incomeGroups = result?.chartData.incomeGroups ?? [];
  const maxCountry = Math.max(1, ...countries.map((item) => item.count));
  const maxClimate = Math.max(1, ...climateZones.map((item) => item.count));
  const maxIncome = Math.max(1, ...incomeGroups.map((item) => item.count));
  const quickSignals = [
    ...(result?.chartData.urbanFormVariables.slice(0, 2) ?? []),
    ...(result?.chartData.energyOutcomes.slice(0, 2) ?? []),
  ];
  const maxSignal = Math.max(1, ...quickSignals.map((item) => item.count));
  const cards = [
    ["Papers", summary?.totalPapers ?? result?.papers.length ?? 0],
    ["Included", summary?.includedPapers ?? 0],
    ["Manual review", summary?.manualReviewCount ?? 0],
    ["Markers", result?.mapData.length ?? 0],
  ] as const;

  return (
    <aside className="flex flex-col gap-5">
      <section className={majorCard}>
        <h2 className={titleText}>Evidence overview</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {cards.map(([label, value]) => (
            <div className={innerPanel} key={label}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className={majorCard}>
        <h2 className={titleText}>Study-area countries</h2>
        {countries.length ? (
          <div className="mt-4 space-y-3">
            {countries.map((country) => (
              <div key={country.name}>
                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{country.name}</span><span>{country.count}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-400" style={{ width: `${(country.count / maxCountry) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`${descriptionText} mt-3`}>Study-area country counts appear when title/abstract text contains clear locations.</p>
        )}
      </section>
      <section className={majorCard}>
        <h2 className={titleText}>Climate context</h2>
        {climateZones.length ? (
          <div className="mt-4 space-y-3">
            {climateZones.map((zone) => (
              <div key={zone.name}>
                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{zone.name}</span><span>{zone.count}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-400" style={{ width: `${(zone.count / maxClimate) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`${descriptionText} mt-3`}>Unknown climate zone counts appear until reliable climate evidence is found.</p>
        )}
      </section>
      <section className={majorCard}>
        <h2 className={titleText}>Income groups</h2>
        {incomeGroups.length ? (
          <div className="mt-4 space-y-3">
            {incomeGroups.map((group) => (
              <div key={group.name}>
                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{group.name}</span><span>{group.count}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-500" style={{ width: `${(group.count / maxIncome) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`${descriptionText} mt-3`}>Income group counts appear after the World Bank lookup runs.</p>
        )}
      </section>
      <section className={majorCard}>
        <h2 className={titleText}>Quick signals</h2>
        {quickSignals.length ? (
          <div className="mt-4 space-y-3">
            {quickSignals.map((signal) => (
              <div key={signal.name}>
                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{signal.name}</span><span>{signal.count}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-500" style={{ width: `${(signal.count / maxSignal) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`${descriptionText} mt-3`}>Urban-form and energy-outcome signals appear after LLM coding.</p>
        )}
      </section>
      <ResearchGapsPanel gaps={result?.gapMap ?? []} compact />
    </aside>
  );
};

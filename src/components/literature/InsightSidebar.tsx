import { isKnownLocationValue } from "../../lib/geo/locationDisplay";
import { regionForCountry } from "../../lib/geo/worldRegions";
import type { Paper, ReviewRunResponse } from "../../types/review";
import { descriptionText, innerPanel, majorCard, titleText } from "./dashboardShared";

interface InsightSidebarProps {
  result: ReviewRunResponse | null;
}

const hasMappedMarker = (paper: Paper, mappedPaperIds: Set<string>): boolean => mappedPaperIds.has(paper.id);

const regionCounts = (papers: Paper[]): Array<{ name: string; count: number }> => {
  const counts = new Map<string, Set<string>>();
  const add = (region: string | undefined, paperId: string) => {
    if (!isKnownLocationValue(region)) return;
    if (!counts.has(region)) counts.set(region, new Set());
    counts.get(region)!.add(paperId);
  };
  papers.forEach((paper) => {
    const regions = paper.studyAreaRegions?.filter(isKnownLocationValue) ?? [];
    if (regions.length) regions.forEach((region) => add(region, paper.id));
    else add(paper.geoMention?.region ?? regionForCountry(paper.geoMention?.country ?? paper.studyAreaCountries?.[0]), paper.id);
  });
  return Array.from(counts.entries())
    .map(([name, ids]) => ({ name, count: ids.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);
};

export const InsightSidebar = ({ result }: InsightSidebarProps) => {
  const mappedPaperIds = new Set(result?.mapData.flatMap((item) => item.papers) ?? []);
  const countriesCovered = new Set(result?.mapData.map((item) => item.country).filter(isKnownLocationValue) ?? []).size;
  const unmappedPapers = result?.papers.filter((paper) => !hasMappedMarker(paper, mappedPaperIds) && (!paper.geoMention || paper.geoMention.locationRole === "unknown")).length ?? 0;
  const topicGroups = result?.chartData.openAlexTopics.slice(0, 6) ?? [];
  const maxSignal = Math.max(1, ...topicGroups.map((item) => item.count));
  const regions = regionCounts(result?.papers ?? []);
  const maxRegion = Math.max(1, ...regions.map((item) => item.count));
  const cards = [
    ["Total papers", result?.evidenceSummary?.totalPapers ?? result?.papers.length ?? 0],
    ["Mapped markers", result?.mapData.length ?? 0],
    ["Countries covered", countriesCovered],
    ["Unmapped papers", unmappedPapers],
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
        <h2 className={titleText}>Study-area regions</h2>
        {regions.length ? (
          <div className="mt-4 space-y-3">
            {regions.map((region) => (
              <div key={region.name}>
                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{region.name}</span><span>{region.count}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-teal-500" style={{ width: `${(region.count / maxRegion) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`${descriptionText} mt-3`}>Region paper counts appear after study-area locations are extracted.</p>
        )}
      </section>
      <section className={majorCard}>
        <h2 className={titleText}>Topic groups</h2>
        {topicGroups.length ? (
          <div className="mt-4 space-y-3">
            {topicGroups.map((signal) => (
              <div key={signal.name}>
                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{signal.name}</span><span>{signal.count}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-500" style={{ width: `${(signal.count / maxSignal) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`${descriptionText} mt-3`}>OpenAlex primary-topic signals appear after search.</p>
        )}
      </section>
    </aside>
  );
};

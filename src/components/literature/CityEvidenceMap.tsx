import { MapPin } from "lucide-react";

import type { MapDataItem, Paper } from "../../types/review";
import { descriptionText, innerPanel, majorCard, titleText } from "./dashboardShared";

interface CityEvidenceMapProps {
  mapData: MapDataItem[];
  papers: Paper[];
}

const maxCount = (items: MapDataItem[]): number => Math.max(1, ...items.map((item) => item.paperCount));
const projectLon = (lon: number): number => ((lon + 180) / 360) * 100;
const projectLat = (lat: number): number => ((90 - lat) / 180) * 100;

const countBy = (papers: Paper[], predicate: (paper: Paper) => boolean): number => papers.filter(predicate).length;

const studyAreaLabel = (paper: Paper): string | undefined => {
  const mention = paper.geoMention;
  if (!mention || mention.locationRole === "unknown") return undefined;
  return [mention.city, mention.country, mention.region].filter(Boolean).join(", ") || mention.locationRole;
};

const studyAreaLabels = (paper: Paper): string[] => {
  const label = studyAreaLabel(paper);
  if (!label) return [];
  const mention = paper.geoMention;
  if (!mention?.city || !/(,|\band\b)/i.test(mention.city)) return [label];
  const suffix = [mention.country, mention.region].filter(Boolean).join(", ");
  return mention.city
    .split(/\s*,\s*|\s+and\s+/i)
    .map((city) => city.trim())
    .filter((city) => city.length > 1)
    .map((city) => [city, suffix].filter(Boolean).join(", "));
};

const topStudyAreas = (papers: Paper[]): Array<{ name: string; count: number }> => {
  const counts = new Map<string, number>();
  papers.forEach((paper) => {
    studyAreaLabels(paper).forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);
};

export const CityEvidenceMap = ({ mapData, papers }: CityEvidenceMapProps) => {
  const maximum = maxCount(mapData);
  const countryOnly = countBy(papers, (paper) => paper.geoMention?.locationRole === "country_only");
  const regionOnly = countBy(papers, (paper) => paper.geoMention?.locationRole === "region_only");
  const notGeocoded = countBy(papers, (paper) => paper.geoMention?.locationRole === "study_area" && paper.geoMention.coordinateSource === "none");
  const unmapped = countBy(papers, (paper) => !paper.geoMention || paper.geoMention.locationRole === "unknown");
  const studyAreas = topStudyAreas(papers);
  const maxStudyArea = Math.max(1, ...studyAreas.map((area) => area.count));

  return (
    <section className={`${majorCard} overflow-hidden`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className={titleText}>Study-area evidence map</h2>
          <p className={descriptionText}>Markers use extracted study-area locations only. Author affiliations, institutions, and publisher locations are never mapped.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{mapData.length} mapped study areas/countries</span>
      </div>
      <div className="relative min-h-[480px] overflow-hidden rounded-3xl border border-slate-200 bg-[#dbeafe]">
        <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 500">
          <rect width="1000" height="500" fill="#dbeafe" />
          <path d="M130 95 L210 70 L300 100 L330 150 L295 205 L235 220 L220 285 L180 330 L130 305 L95 230 L60 190 L75 125 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M250 300 L315 330 L335 390 L300 465 L255 445 L235 375 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M430 85 L515 70 L610 95 L610 145 L550 160 L500 145 L445 150 L390 130 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M475 150 L545 155 L575 210 L555 285 L520 360 L480 350 L455 280 L430 220 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M565 145 L700 105 L850 130 L925 205 L880 260 L760 250 L705 300 L635 270 L650 205 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M760 320 L855 340 L900 405 L835 450 L745 420 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M480 105 L500 95 L520 110 L505 125 Z M535 135 L555 132 L570 145 L545 150 Z M615 295 L635 292 L648 305 L625 315 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          {[125, 250, 375].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#bfdbfe" strokeDasharray="6 8" strokeWidth="1" />)}
          {[125, 250, 375, 500, 625, 750, 875].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="500" stroke="#bfdbfe" strokeDasharray="6 8" strokeWidth="1" />)}
        </svg>
        {mapData.length > 0 ? (
          mapData.map((item) => {
            const size = 18 + (item.paperCount / maximum) * 34;
            return (
              <div key={item.locationKey} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${projectLon(item.lon)}%`, top: `${projectLat(item.lat)}%` }}>
                <div className="flex items-center justify-center rounded-full border border-white/80 bg-[var(--primary)]/80 text-[10px] font-bold text-white shadow-lg shadow-slate-400/30 ring-4 ring-[var(--primary)]/10" style={{ width: size, height: size }}>{item.paperCount}</div>
                <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-64 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl group-hover:block">
                  <p className="font-semibold text-slate-900">{item.country ?? item.locationKey}</p>
                  {item.city || item.region ? <p className="mt-1 text-slate-500">{[item.city, item.region].filter(Boolean).join(", ")}</p> : null}
                  <p className="mt-1 text-slate-500">{item.paperCount} papers · avg confidence {Math.round(item.averageConfidence * 100)}%</p>
                  <p className="mt-2 text-slate-600">Climate: {item.climateZone ?? "Unknown climate zone"} · Income: {item.incomeGroup ?? "Unknown income group"}</p>
                  <p className="mt-2 text-slate-600">Top topics: {item.topTopics.length ? item.topTopics.join(", ") : "pending coding"}</p>
                  {item.evidenceTexts[0] ? <p className="mt-2 text-slate-500">Evidence: {item.evidenceTexts[0]}</p> : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full border border-slate-200 bg-white p-4 shadow-sm"><MapPin className="h-7 w-7 text-slate-400" /></div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No geocoded study-area markers yet.</h3>
            <p className={`${descriptionText} mt-1 max-w-md`}>Run a review to extract study areas. Locations without reliable coordinates stay in the unmapped summaries instead of being forced onto the map.</p>
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className={innerPanel}><p className="text-xs font-semibold text-slate-500">Country-only</p><p className="mt-1 text-xl font-semibold text-slate-900">{countryOnly}</p></div>
        <div className={innerPanel}><p className="text-xs font-semibold text-slate-500">Region-only</p><p className="mt-1 text-xl font-semibold text-slate-900">{regionOnly}</p></div>
        <div className={innerPanel}><p className="text-xs font-semibold text-slate-500">Not geocoded</p><p className="mt-1 text-xl font-semibold text-slate-900">{notGeocoded}</p></div>
        <div className={innerPanel}><p className="text-xs font-semibold text-slate-500">Unmapped</p><p className="mt-1 text-xl font-semibold text-slate-900">{unmapped}</p></div>
      </div>
      <div className={`${innerPanel} mt-4`}>
        <p className="text-sm font-semibold text-slate-800">Extracted study-area locations</p>
        {studyAreas.length ? (
          <div className="mt-3 space-y-2">
            {studyAreas.map((area) => (
              <div key={area.name}>
                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{area.name}</span><span>{area.count}</span></div>
                <div className="mt-1 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-slate-400" style={{ width: `${(area.count / maxStudyArea) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`${descriptionText} mt-2`}>No study-area location has been extracted from titles or abstracts yet.</p>
        )}
      </div>
    </section>
  );
};

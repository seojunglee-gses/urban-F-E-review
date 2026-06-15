import { useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";

import { WORLD_LAND_RINGS, worldRingToSvgPath } from "../../lib/geo/worldMapSvg";
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

const regionCounts = (papers: Paper[], mapData: MapDataItem[]): Array<{ name: string; count: number }> => {
  const counts = new Map<string, Set<string>>();
  papers.forEach((paper) => {
    const regions = paper.studyAreaRegions?.length ? paper.studyAreaRegions : paper.geoMention?.region ? [paper.geoMention.region] : [];
    regions.forEach((region) => {
      if (!counts.has(region)) counts.set(region, new Set());
      counts.get(region)!.add(paper.id);
    });
  });
  mapData.forEach((item) => {
    const region = item.region;
    if (!region) return;
    if (!counts.has(region)) counts.set(region, new Set());
    item.papers.forEach((paperId) => counts.get(region)!.add(paperId));
  });
  return Array.from(counts.entries())
    .map(([name, paperIds]) => ({ name, count: paperIds.size }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);
};

const offsetMarkers = (items: MapDataItem[]): Array<MapDataItem & { renderLat: number; renderLon: number }> => {
  const countryHasCity = new Set(items.filter((item) => item.city && item.country).map((item) => item.country));
  const coordinateBuckets = new Map<string, number>();
  return items.map((item) => {
    const coordinateKey = `${item.lat.toFixed(1)}:${item.lon.toFixed(1)}`;
    const bucketIndex = coordinateBuckets.get(coordinateKey) ?? 0;
    coordinateBuckets.set(coordinateKey, bucketIndex + 1);
    const sameCountryCityOffset = !item.city && item.country && countryHasCity.has(item.country) ? 1 : 0;
    const angle = (bucketIndex * 137.5 * Math.PI) / 180;
    const radius = bucketIndex === 0 && !sameCountryCityOffset ? 0 : 2.2 + bucketIndex * 0.8 + sameCountryCityOffset;
    return {
      ...item,
      renderLat: Math.max(-82, Math.min(84, item.lat + Math.sin(angle) * radius + sameCountryCityOffset * 1.6)),
      renderLon: Math.max(-178, Math.min(178, item.lon + Math.cos(angle) * radius + sameCountryCityOffset * 1.6)),
    };
  });
};

export const CityEvidenceMap = ({ mapData, papers }: CityEvidenceMapProps) => {
  const [activeLocationKey, setActiveLocationKey] = useState<string | null>(null);
  const maximum = maxCount(mapData);
  const countryOnly = countBy(papers, (paper) => paper.geoMention?.locationRole === "country_only");
  const regionOnly = countBy(papers, (paper) => paper.geoMention?.locationRole === "region_only");
  const notGeocoded = countBy(papers, (paper) => paper.geoMention?.locationRole === "study_area" && paper.geoMention.coordinateSource === "none");
  const unmapped = countBy(papers, (paper) => !paper.geoMention || paper.geoMention.locationRole === "unknown");
  const studyAreas = topStudyAreas(papers);
  const maxStudyArea = Math.max(1, ...studyAreas.map((area) => area.count));
  const evidenceByRegion = regionCounts(papers, mapData);
  const maxRegion = Math.max(1, ...evidenceByRegion.map((region) => region.count));
  const displayMapData = useMemo(() => offsetMarkers(mapData), [mapData]);

  return (
    <section className={`${majorCard} overflow-hidden`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className={titleText}>Study-area evidence map</h2>
          <p className={descriptionText}>Markers use extracted study-area locations only. Author affiliations, institutions, and publisher locations are never mapped.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{mapData.length} mapped study areas/countries</span>
      </div>
      <div className="relative min-h-[480px] overflow-hidden rounded-3xl border border-slate-200 bg-[#dbeafe]" onClick={() => setActiveLocationKey(null)}>
        <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 500">
          <rect width="1000" height="500" fill="#dbeafe" />
          {[125, 250, 375].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#bfdbfe" strokeDasharray="6 8" strokeWidth="1" />)}
          {[125, 250, 375, 500, 625, 750, 875].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="500" stroke="#bfdbfe" strokeDasharray="6 8" strokeWidth="1" />)}
          {WORLD_LAND_RINGS.map((ring, index) => (
            <path key={index} d={worldRingToSvgPath(ring)} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          ))}
        </svg>
        {mapData.length > 0 ? (
          displayMapData.map((item) => {
            const size = 18 + (item.paperCount / maximum) * 34;
            const active = activeLocationKey === item.locationKey;
            return (
              <div key={item.locationKey} className="group absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${projectLon(item.renderLon)}%`, top: `${projectLat(item.renderLat)}%` }} onClick={(event) => { event.stopPropagation(); setActiveLocationKey(item.locationKey); }}>
                <button aria-label={`Open details for ${item.locationKey}`} className="flex items-center justify-center rounded-full border border-white/80 bg-[var(--primary)]/80 text-[10px] font-bold text-white shadow-lg shadow-slate-400/30 ring-4 ring-[var(--primary)]/10" style={{ width: size, height: size }} type="button">{item.paperCount}</button>
                <div className={`${active ? "block" : "hidden group-hover:block"} absolute left-1/2 top-full z-10 mt-2 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl`} onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 text-slate-600">
                      {item.country ? <p><span className="font-semibold text-slate-900">Country:</span> {item.country}</p> : null}
                      {item.region ? <p><span className="font-semibold text-slate-900">Region:</span> {item.region}</p> : null}
                      {item.city ? <p><span className="font-semibold text-slate-900">City:</span> {item.city}</p> : null}
                      <p><span className="font-semibold text-slate-900">Papers:</span> {item.paperCount}</p>
                    </div>
                    {active ? <button aria-label="Close location details" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" type="button" onClick={() => setActiveLocationKey(null)}><X className="h-3.5 w-3.5" /></button> : null}
                  </div>
                  <p className="mt-2 text-slate-500">Avg confidence {Math.round(item.averageConfidence * 100)}%</p>
                  <p className="mt-2 text-slate-600">Climate: {item.climateZone ?? "Unknown climate zone"} · Income: {item.incomeGroup ?? "Unknown income group"}</p>
                  <p className="mt-2 text-slate-600">Top OpenAlex primary topics: {item.topTopics.length ? item.topTopics.join(", ") : "No primary topic metadata"}</p>
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
        <p className="text-sm font-semibold text-slate-800">Evidence by region</p>
        {evidenceByRegion.length ? (
          <div className="mt-3 space-y-2">
            {evidenceByRegion.map((region) => (
              <div key={region.name}>
                <div className="flex justify-between text-xs font-semibold text-slate-600"><span>{region.name}</span><span>{region.count} papers</span></div>
                <div className="mt-1 h-2 rounded-full bg-white"><div className="h-2 rounded-full bg-[var(--primary)]/70" style={{ width: `${(region.count / maxRegion) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <p className={`${descriptionText} mt-2`}>Region-level evidence appears after study-area countries or regions are extracted.</p>
        )}
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

import { useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";

import { isKnownLocationValue, isValidStudyAreaCity } from "../../lib/geo/locationDisplay";
import { REGION_OVERLAY_SHAPES } from "../../lib/geo/regionOverlay";
import { regionForCountry } from "../../lib/geo/worldRegions";
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
const projectSvgX = (lon: number): number => projectLon(lon) * 10;
const projectSvgY = (lat: number): number => projectLat(lat) * 5;

const regionClipId = (regionName: string, index: number): string => `region-overlay-${regionName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`;

const countBy = (papers: Paper[], predicate: (paper: Paper) => boolean): number => papers.filter(predicate).length;

const mostSpecificStudyArea = (paper: Paper): string | undefined => {
  const city = isValidStudyAreaCity(paper.geoMention?.city) ? paper.geoMention?.city?.trim() : undefined;
  const country = isKnownLocationValue(paper.geoMention?.country) ? paper.geoMention?.country?.trim() : paper.studyAreaCountries?.find(isKnownLocationValue);
  const region = isKnownLocationValue(paper.geoMention?.region) ? paper.geoMention?.region?.trim() : paper.studyAreaRegions?.find(isKnownLocationValue) ?? regionForCountry(country);
  return city ?? country ?? region;
};

const getStudyAreaDisplayLabels = (paper: Paper): string[] => {
  const label = mostSpecificStudyArea(paper);
  if (!label) return [];
  const mention = paper.geoMention;
  if (!mention?.city || !isValidStudyAreaCity(mention.city) || !/(,|\band\b)/i.test(mention.city)) return [label];
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
    getStudyAreaDisplayLabels(paper).forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1));
  });
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6);
};

const regionOnlyCounts = (papers: Paper[], exactMapData: MapDataItem[]): Array<{ name: string; count: number; papers: string[] }> => {
  const mappedPaperIds = new Set(exactMapData.flatMap((item) => item.papers));
  const counts = new Map<string, Set<string>>();
  papers.forEach((paper) => {
    if (mappedPaperIds.has(paper.id)) return;
    if (paper.geoMention?.coordinateSource !== "none") return;
    const region = paper.geoMention?.region ?? paper.studyAreaRegions?.find(isKnownLocationValue) ?? regionForCountry(paper.geoMention?.country ?? paper.studyAreaCountries?.[0]);
    if (!isKnownLocationValue(region)) return;
    if (!counts.has(region)) counts.set(region, new Set());
    counts.get(region)!.add(paper.id);
  });
  return Array.from(counts.entries()).map(([name, ids]) => ({ name, count: ids.size, papers: Array.from(ids) }));
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
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const maximum = maxCount(mapData);
  const countryOnly = countBy(papers, (paper) => paper.geoMention?.locationRole === "country_only");
  const regionOnly = countBy(papers, (paper) => paper.geoMention?.locationRole === "region_only");
  const studyAreasMissingCoordinates = countBy(papers, (paper) => paper.geoMention?.locationRole === "study_area" && paper.geoMention.coordinateSource === "none");
  const unknownStudyAreaCount = countBy(papers, (paper) => !paper.geoMention || paper.geoMention.locationRole === "unknown");
  const studyAreas = topStudyAreas(papers);
  const maxStudyArea = Math.max(1, ...studyAreas.map((area) => area.count));
  const regionOnlyEvidence = regionOnlyCounts(papers, mapData);
  const displayMapData = useMemo(() => offsetMarkers(mapData), [mapData]);

  return (
    <section className={`${majorCard} overflow-hidden`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className={titleText}>Study-area evidence map</h2>
          <p className={descriptionText}>Markers use extracted study-area locations only. Author affiliations, institutions, and publisher locations are never mapped.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{mapData.length} exact mapped markers</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-[var(--primary)]/10 px-3 py-1 text-[var(--primary)]">Exact city/country markers</span><span className="rounded-full bg-teal-500/15 px-3 py-1 text-teal-800">Region-only evidence overlay</span></div>
      <div className="relative min-h-[480px] overflow-hidden rounded-3xl border border-slate-200 bg-[#dbeafe]" onClick={() => { setActiveLocationKey(null); setActiveRegion(null); }}>
        <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 500">
          <rect width="1000" height="500" fill="#dbeafe" />
          {[125, 250, 375].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#bfdbfe" strokeDasharray="6 8" strokeWidth="1" />)}
          {[125, 250, 375, 500, 625, 750, 875].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="500" stroke="#bfdbfe" strokeDasharray="6 8" strokeWidth="1" />)}
          {WORLD_LAND_RINGS.map((ring, index) => (
            <path key={index} d={worldRingToSvgPath(ring)} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          ))}
          <defs>
            {REGION_OVERLAY_SHAPES.flatMap((shape) =>
              shape.bounds.map((bounds, index) => {
                const x = projectSvgX(bounds.lonMin);
                const y = projectSvgY(bounds.latMax);
                const width = projectSvgX(bounds.lonMax) - x;
                const height = projectSvgY(bounds.latMin) - y;
                return <clipPath id={regionClipId(shape.name, index)} key={regionClipId(shape.name, index)}><rect height={height} width={width} x={x} y={y} /></clipPath>;
              }),
            )}
          </defs>
          {REGION_OVERLAY_SHAPES.map((shape) => {
            const region = regionOnlyEvidence.find((item) => item.name === shape.name);
            if (!region) return null;
            return (
              <g key={shape.name} pointerEvents="none">
                {shape.bounds.map((_, boundsIndex) => (
                  <g clipPath={`url(#${regionClipId(shape.name, boundsIndex)})`} key={regionClipId(shape.name, boundsIndex)}>
                    {WORLD_LAND_RINGS.map((ring, ringIndex) => (
                      <path key={`${boundsIndex}-${ringIndex}`} d={worldRingToSvgPath(ring)} fill="#14b8a6" fillOpacity="0.2" stroke="#0f766e" strokeOpacity="0.45" strokeWidth="2" />
                    ))}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>
        {regionOnlyEvidence.map((region) => {
          const shape = REGION_OVERLAY_SHAPES.find((item) => item.name === region.name);
          if (!shape) return null;
          const active = activeRegion === region.name;
          return (
            <button aria-label={`Open region-only evidence for ${region.name}`} key={region.name} className="absolute z-20 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-teal-700/50 bg-teal-600/85 text-[11px] font-bold text-white shadow-lg shadow-slate-400/30 ring-4 ring-teal-500/10 backdrop-blur-sm" style={{ left: `${projectLon(shape.labelLon)}%`, top: `${projectLat(shape.labelLat)}%` }} type="button" onClick={(event) => { event.stopPropagation(); setActiveLocationKey(null); setActiveRegion(region.name); }}>
              {region.count}
              <div className={`${active ? "block" : "hidden"} pointer-events-auto absolute left-1/2 top-full z-[90] mt-2 w-64 -translate-x-1/2 rounded-2xl border border-teal-200 bg-white p-3 text-left text-xs font-medium text-slate-600 shadow-2xl`}>
                <div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">Region-only evidence</p><p className="mt-1"><span className="font-semibold">Region:</span> {region.name}</p><p><span className="font-semibold">Papers:</span> {region.count}</p></div><span className="text-slate-400">×</span></div>
              </div>
            </button>
          );
        })}
        {mapData.length > 0 ? (
          displayMapData.map((item) => {
            const size = 18 + (item.paperCount / maximum) * 34;
            const active = activeLocationKey === item.locationKey;
            return (
              <div key={item.locationKey} className="group absolute z-30 -translate-x-1/2 -translate-y-1/2" style={{ left: `${projectLon(item.renderLon)}%`, top: `${projectLat(item.renderLat)}%` }} onClick={(event) => { event.stopPropagation(); setActiveLocationKey(item.locationKey); }}>
                <button aria-label={`Open details for ${item.locationKey}`} className="flex items-center justify-center rounded-full border border-white/80 bg-[var(--primary)]/80 text-[10px] font-bold text-white shadow-lg shadow-slate-400/30 ring-4 ring-[var(--primary)]/10" style={{ width: size, height: size }} type="button">{item.paperCount}</button>
                <div className={`${active ? "block" : "hidden group-hover:block"} absolute left-1/2 top-full z-[90] mt-2 w-72 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl`} onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 text-slate-600">
                      {item.country ? <p><span className="font-semibold text-slate-900">Country:</span> {item.country}</p> : null}
                      {item.region ? <p><span className="font-semibold text-slate-900">Region:</span> {item.region}</p> : null}
                      {item.city ? <p><span className="font-semibold text-slate-900">City:</span> {item.city}</p> : null}
                      <p><span className="font-semibold text-slate-900">Papers:</span> {item.paperCount}</p>
                    </div>
                    {active ? <button aria-label="Close location details" className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" type="button" onClick={() => { setActiveLocationKey(null); setActiveRegion(null); }}><X className="h-3.5 w-3.5" /></button> : null}
                  </div>
                  <p className="mt-2 text-slate-500">Avg confidence {Math.round(item.averageConfidence * 100)}%</p>
                  <p className="mt-2 text-slate-600">Top OpenAlex primary topics: {item.topTopics.length ? item.topTopics.join(", ") : "No primary topic metadata"}</p>
                  {item.evidenceTexts[0] ? <p className="mt-2 text-slate-500">Evidence: {item.evidenceTexts[0]}</p> : null}
                </div>
              </div>
            );
          })
        ) : regionOnlyEvidence.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full border border-slate-200 bg-white p-4 shadow-sm"><MapPin className="h-7 w-7 text-slate-400" /></div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No geocoded study-area markers yet.</h3>
            <p className={`${descriptionText} mt-1 max-w-md`}>Run a review to extract study areas. Locations without reliable coordinates stay in the unmapped summaries instead of being forced onto the map.</p>
          </div>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className={innerPanel}><p className="text-xs font-semibold text-slate-500">Country-only</p><p className="mt-1 text-xl font-semibold text-slate-900">{countryOnly}</p></div>
        <div className={innerPanel}><p className="text-xs font-semibold text-slate-500">Region-only</p><p className="mt-1 text-xl font-semibold text-slate-900">{regionOnly}</p></div>
        <div className={innerPanel}><p className="text-xs font-semibold text-slate-500">Study areas missing coordinates</p><p className="mt-1 text-xl font-semibold text-slate-900">{studyAreasMissingCoordinates}</p></div>
        <div className={innerPanel}><p className="text-xs font-semibold text-slate-500">Unmapped</p><p className="mt-1 text-xl font-semibold text-slate-900">{unknownStudyAreaCount}</p></div>
      </div>
      {fullyUnmappedPapers.length ? (
        <div className={`${innerPanel} mt-4`}>
          <p className="text-sm font-semibold text-slate-800">Needs review: unmapped papers</p>
          <p className={`${descriptionText} mt-1`}>These records are not shown on the map because no study-area city, country, or region was validated.</p>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            {fullyUnmappedPapers.map((paper) => <li key={paper.id} className="line-clamp-2 rounded-xl bg-white px-3 py-2">{paper.title}</li>)}
          </ul>
        </div>
      ) : null}
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

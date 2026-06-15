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
          {[125, 250, 375].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} stroke="#bfdbfe" strokeDasharray="6 8" strokeWidth="1" />)}
          {[125, 250, 375, 500, 625, 750, 875].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="500" stroke="#bfdbfe" strokeDasharray="6 8" strokeWidth="1" />)}
          <path d="M42 124 C72 104 97 96 129 99 C154 72 203 61 241 74 C278 86 296 111 326 120 C348 130 359 150 351 170 C340 194 312 199 288 199 C270 207 265 229 245 239 C221 251 194 240 180 218 C163 207 141 207 121 196 C96 184 78 166 57 159 C37 154 27 139 42 124 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M303 38 C333 20 383 22 408 45 C433 67 425 99 390 111 C361 122 321 112 300 91 C282 72 282 51 303 38 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M275 255 C303 251 329 273 333 306 C345 328 365 345 357 377 C350 407 326 425 314 456 C298 437 281 411 270 383 C260 355 242 334 247 305 C251 281 258 264 275 255 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M430 139 C455 119 492 111 521 120 C543 127 552 147 536 160 C518 173 484 166 461 177 C443 185 419 174 410 158 C404 148 413 143 430 139 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M493 184 C524 174 559 188 575 219 C592 250 584 288 565 319 C548 348 534 382 506 375 C482 369 469 333 463 303 C457 272 438 248 449 218 C457 198 472 190 493 184 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M535 131 C579 107 646 88 704 101 C756 112 800 123 852 137 C901 151 935 184 946 220 C919 233 876 228 842 252 C808 276 768 259 733 282 C702 303 671 282 645 254 C623 230 581 230 561 206 C543 184 559 160 535 131 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M685 260 C711 256 727 276 719 301 C708 316 687 311 677 292 C668 277 671 266 685 260 Z M748 272 C764 270 783 280 786 296 C769 304 751 298 742 285 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M766 345 C803 325 861 331 895 365 C873 401 827 421 780 407 C748 397 737 365 766 345 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M438 116 C448 108 463 111 470 121 C457 129 445 128 438 116 Z M483 132 C493 128 507 130 515 139 C504 147 489 144 483 132 Z M617 296 C629 289 647 291 657 302 C646 313 627 310 617 296 Z M231 222 C243 217 256 222 262 235 C248 241 235 237 231 222 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
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

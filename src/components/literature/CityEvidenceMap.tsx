import { MapPin } from "lucide-react";

import { getCountryCoordinate } from "../../lib/geo/countryCoordinates";
import type { MapDataItem } from "../../types/review";
import { descriptionText, majorCard, titleText } from "./dashboardShared";

interface CityEvidenceMapProps {
  mapData: MapDataItem[];
}

const maxCount = (items: MapDataItem[]): number => Math.max(1, ...items.map((item) => item.paperCount));

export const CityEvidenceMap = ({ mapData }: CityEvidenceMapProps) => {
  const maximum = maxCount(mapData);
  const plotted = mapData
    .map((item) => ({ item, coordinate: getCountryCoordinate(item.country) }))
    .filter((entry): entry is { item: MapDataItem; coordinate: NonNullable<ReturnType<typeof getCountryCoordinate>> } => Boolean(entry.coordinate));

  return (
    <section className={`${majorCard} overflow-hidden`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className={titleText}>Evidence distribution by country</h2>
          <p className={descriptionText}>OpenAlex affiliation countries are aggregated into paper-count bubbles. City-level mapping is only used when reliable metadata exists.</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">{mapData.length} countries</span>
      </div>
      <div className="relative min-h-[480px] overflow-hidden rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_30%_20%,#e2e8f0_0,#f8fafc_35%,#f1f5f9_100%)]">
        <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path d="M7 38 C17 25 30 28 39 34 C48 21 65 23 78 32 C90 42 89 60 78 67 C65 75 49 71 39 63 C28 75 14 70 8 58 C3 49 3 44 7 38 Z" fill="white" opacity="0.78" />
          <path d="M14 55 C25 50 33 53 39 60 M49 38 C55 34 63 35 70 42 M66 58 C72 61 79 61 86 57" fill="none" stroke="#cbd5e1" strokeLinecap="round" strokeWidth="0.5" />
        </svg>
        {plotted.length > 0 ? (
          plotted.map(({ item, coordinate }) => {
            const size = 18 + (item.paperCount / maximum) * 34;
            return (
              <div
                key={item.country}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${coordinate.x}%`, top: `${coordinate.y}%` }}
              >
                <div className="flex items-center justify-center rounded-full border border-white/80 bg-[var(--primary)]/80 text-[10px] font-bold text-white shadow-lg shadow-slate-400/30 ring-4 ring-[var(--primary)]/10" style={{ width: size, height: size }}>
                  {item.paperCount}
                </div>
                <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-xl group-hover:block">
                  <p className="font-semibold text-slate-900">{item.country}</p>
                  <p className="mt-1 text-slate-500">{item.paperCount} papers · {item.includedCount} included</p>
                  <p className="mt-2 text-slate-600">Top topics: {item.topTopics.length ? item.topTopics.join(", ") : "pending coding"}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full border border-slate-200 bg-white p-4 shadow-sm"><MapPin className="h-7 w-7 text-slate-400" /></div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Run a review to populate the evidence map.</h3>
            <p className={`${descriptionText} mt-1 max-w-md`}>The map will use OpenAlex country or institution metadata; it will not invent city coordinates.</p>
          </div>
        )}
      </div>
      {mapData.length > plotted.length ? <p className={`${descriptionText} mt-3`}>{mapData.length - plotted.length} countries are listed in the sidebar but do not yet have map coordinates.</p> : null}
    </section>
  );
};

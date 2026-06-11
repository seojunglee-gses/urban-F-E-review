import { MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import type { LiteraturePipelineController } from "../../hooks/useLiteraturePipeline";
import {
  buildCityEvidencePoints,
  cardClass,
  descriptionClass,
  type CityEvidencePoint,
} from "./dashboardShared";

export function CityEvidenceMap({
  pipeline,
}: {
  pipeline: LiteraturePipelineController;
}) {
  const points = useMemo(() => buildCityEvidencePoints(pipeline), [pipeline]);
  const [activePoint, setActivePoint] = useState<CityEvidencePoint | null>(
    null,
  );
  const maxCount = Math.max(1, ...points.map((point) => point.count));

  return (
    <section className={cardClass}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Spatial evidence
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            City-level evidence distribution
          </h2>
          <p className={descriptionClass}>
            Bubble size shows paper count by extracted city or candidate
            location.
          </p>
        </div>
        {activePoint && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right shadow-sm">
            <p className="text-sm font-semibold text-slate-800">
              {activePoint.city}
            </p>
            <p className="text-xs text-slate-500">
              {activePoint.count} papers · {activePoint.topTopic}
            </p>
          </div>
        )}
      </div>

      <div className="relative mt-4 min-h-[480px] overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-inner">
        <WorldMapBackdrop />
        <div className="absolute left-5 top-5 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          Evidence map
        </div>
        {points.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
              <MapPin className="mx-auto h-5 w-5 text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                Run a search or demo to populate the evidence map.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Demo mode fills this map with realistic city-level evidence.
              </p>
            </div>
          </div>
        ) : (
          points.map((point) => {
            const size = 18 + (point.count / maxCount) * 34;
            return (
              <button
                key={`${point.city}-${point.country}`}
                type="button"
                className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900/85 text-[10px] font-semibold text-white shadow-lg ring-4 ring-slate-900/5 transition hover:scale-110 hover:bg-[var(--primary)]"
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  width: size,
                  height: size,
                }}
                onMouseEnter={() => setActivePoint(point)}
                onFocus={() => setActivePoint(point)}
                title={`${point.city}: ${point.count} papers · ${point.topTopic}`}
              >
                {point.count}
                <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden min-w-max -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-slate-700 shadow-lg group-hover:block group-focus:block">
                  {point.city}
                  <br />
                  <span className="font-normal text-slate-500">
                    {point.count} papers · {point.topTopic}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Coordinate matching is deterministic for MVP city names; spatial polygon
        joins can be added later.
      </p>
    </section>
  );
}

function WorldMapBackdrop() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1000 520"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mapGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <rect width="1000" height="520" fill="url(#mapGradient)" />
      <path
        d="M92 170 C150 110 225 112 278 160 C235 188 220 232 158 228 C118 226 82 212 92 170Z"
        fill="#cbd5e1"
        opacity="0.72"
      />
      <path
        d="M240 278 C300 250 356 288 334 350 C305 420 242 434 210 382 C188 344 198 300 240 278Z"
        fill="#cbd5e1"
        opacity="0.62"
      />
      <path
        d="M455 148 C512 98 610 112 668 162 C623 204 530 204 462 188 C430 180 426 166 455 148Z"
        fill="#cbd5e1"
        opacity="0.78"
      />
      <path
        d="M506 228 C575 198 648 218 706 258 C642 304 552 306 492 270 C472 258 478 240 506 228Z"
        fill="#cbd5e1"
        opacity="0.66"
      />
      <path
        d="M695 188 C788 142 888 168 928 238 C872 266 770 262 700 232 C668 218 668 202 695 188Z"
        fill="#cbd5e1"
        opacity="0.78"
      />
      <path
        d="M760 348 C820 320 895 344 922 400 C872 440 790 436 748 396 C730 378 734 360 760 348Z"
        fill="#cbd5e1"
        opacity="0.72"
      />
      <path
        d="M500 310 C548 292 610 316 628 370 C588 408 522 398 488 356 C470 334 476 318 500 310Z"
        fill="#cbd5e1"
        opacity="0.58"
      />
      <g stroke="#94a3b8" strokeOpacity="0.22" strokeWidth="1">
        {Array.from({ length: 9 }).map((_, index) => (
          <line
            key={`v-${index}`}
            x1={100 + index * 100}
            x2={100 + index * 100}
            y1="0"
            y2="520"
          />
        ))}
        {Array.from({ length: 5 }).map((_, index) => (
          <line
            key={`h-${index}`}
            x1="0"
            x2="1000"
            y1={90 + index * 90}
            y2={90 + index * 90}
          />
        ))}
      </g>
    </svg>
  );
}

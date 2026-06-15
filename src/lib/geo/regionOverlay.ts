import type { CountValue } from "../../types/review";

export interface RegionOverlayShape {
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

// Broad equirectangular overlay shapes in the map's 1000×500 viewBox.
// They are intentionally coarse and used only for region-only evidence, not exact locations.
export const REGION_OVERLAY_SHAPES: RegionOverlayShape[] = [
  { name: "East Asia & Pacific", path: "M690 125 L930 120 L950 245 L895 330 L760 330 L700 255 Z", labelX: 820, labelY: 230 },
  { name: "Europe & Central Asia", path: "M455 105 L760 95 L790 195 L665 245 L505 215 L430 160 Z", labelX: 620, labelY: 165 },
  { name: "Latin America & the Caribbean", path: "M235 245 L365 250 L385 395 L330 475 L260 420 L220 320 Z", labelX: 305, labelY: 335 },
  { name: "Middle East & North Africa", path: "M470 205 L655 200 L690 285 L555 330 L420 285 Z", labelX: 555, labelY: 255 },
  { name: "South Asia", path: "M650 225 L760 220 L785 315 L715 365 L655 310 Z", labelX: 710, labelY: 285 },
  { name: "Sub-Saharan Africa", path: "M455 285 L625 285 L660 430 L560 485 L465 410 Z", labelX: 555, labelY: 380 },
];

export const findRegionShape = (name: string): RegionOverlayShape | undefined => REGION_OVERLAY_SHAPES.find((shape) => shape.name === name);

export const topRegionCounts = (counts: CountValue[], limit = 8): CountValue[] => counts.filter((item) => item.count > 0).slice(0, limit);

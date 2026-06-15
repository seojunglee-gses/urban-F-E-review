import type { CountValue } from "../../types/review";

export interface RegionOverlayBounds {
  lonMin: number;
  lonMax: number;
  latMin: number;
  latMax: number;
}

export interface RegionOverlayShape {
  name: string;
  bounds: RegionOverlayBounds[];
  labelLon: number;
  labelLat: number;
}

// Region-only overlays reuse the same equirectangular coordinate system and base land paths
// as the world map. Each bounds entry clips the existing land geometry instead of drawing
// separate abstract blobs that can drift away from the basemap.
export const REGION_OVERLAY_SHAPES: RegionOverlayShape[] = [
  {
    name: "East Asia & Pacific",
    bounds: [
      { lonMin: 92, lonMax: 180, latMin: -48, latMax: 72 },
      { lonMin: 110, lonMax: 180, latMin: -48, latMax: 8 },
    ],
    labelLon: 128,
    labelLat: 24,
  },
  {
    name: "Europe & Central Asia",
    bounds: [{ lonMin: -12, lonMax: 92, latMin: 34, latMax: 75 }],
    labelLon: 46,
    labelLat: 53,
  },
  {
    name: "Latin America & the Caribbean",
    bounds: [
      { lonMin: -118, lonMax: -30, latMin: -56, latMax: 34 },
      { lonMin: -92, lonMax: -58, latMin: 5, latMax: 27 },
    ],
    labelLon: -62,
    labelLat: -15,
  },
  {
    name: "Middle East & North Africa",
    bounds: [
      { lonMin: -18, lonMax: 62, latMin: 12, latMax: 37 },
      { lonMin: 32, lonMax: 62, latMin: 10, latMax: 32 },
    ],
    labelLon: 28,
    labelLat: 27,
  },
  {
    name: "South Asia",
    bounds: [{ lonMin: 62, lonMax: 92, latMin: 5, latMax: 34 }],
    labelLon: 78,
    labelLat: 22,
  },
  {
    name: "Sub-Saharan Africa",
    bounds: [{ lonMin: -18, lonMax: 52, latMin: -36, latMax: 12 }],
    labelLon: 20,
    labelLat: -12,
  },
];

export const topRegionCounts = (counts: CountValue[], limit = 8): CountValue[] => counts.filter((item) => item.count > 0).slice(0, limit);

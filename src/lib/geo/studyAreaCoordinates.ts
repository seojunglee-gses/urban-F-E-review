import { existsSync, readFileSync } from "fs";
import path from "path";

export interface StudyAreaCoordinate {
  name?: string;
  city?: string;
  cityAscii?: string;
  country?: string;
  iso2?: string;
  iso3?: string;
  adminName?: string;
  capital?: string;
  type?: string;
  lat: number;
  lon: number;
  population?: number;
  source?: string;
  sourceId?: string | number;
}

export interface StudyAreaLookupInput {
  city?: string | null;
  country?: string | null;
  studyArea?: string | null;
  normalizedPlaceName?: string | null;
}

type RawCoordinateRecord = Partial<Omit<StudyAreaCoordinate, "lat" | "lon" | "population">> & {
  lat?: number | string | null;
  lon?: number | string | null;
  population?: number | string | null;
};

type CoordinateIndexes = {
  byPlaceAndCountry: Map<string, StudyAreaCoordinate[]>;
  byPlace: Map<string, StudyAreaCoordinate[]>;
};

const AMBIGUOUS_CITY_ONLY_NAMES = new Set(["washington", "springfield", "san jose", "santa cruz", "san fernando"]);
const INVALID_PLACE_TERMS = /\b(?:smart|building|buildings|urban|rural|canadian|compared\s+to\s+similar|selected\s+neighbou?rhoods?|downtown\s+districts?)\b/i;
const DATA_PATH = path.join(process.cwd(), "src", "data", "studyAreaCoordinates.json");

const normalizeText = (value?: string | null): string =>
  value
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase() ?? "";

const isUsablePlace = (value?: string | null): value is string => {
  const normalized = normalizeText(value);
  return normalized.length > 1 && !INVALID_PLACE_TERMS.test(value ?? "");
};

const parseNumber = (value: number | string | null | undefined): number | undefined => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toCoordinate = (record: RawCoordinateRecord): StudyAreaCoordinate | undefined => {
  const lat = parseNumber(record.lat);
  const lon = parseNumber(record.lon);
  if (lat === undefined || lon === undefined) return undefined;
  return {
    ...record,
    lat,
    lon,
    population: parseNumber(record.population),
  };
};

const chooseLargestPopulation = (matches: StudyAreaCoordinate[]): StudyAreaCoordinate | undefined =>
  matches.reduce<StudyAreaCoordinate | undefined>((largest, match) => ((match.population ?? 0) > (largest?.population ?? 0) ? match : largest), undefined);

const addToIndex = (index: Map<string, StudyAreaCoordinate[]>, key: string, coordinate: StudyAreaCoordinate): void => {
  if (!key) return;
  const existing = index.get(key);
  if (existing) {
    existing.push(coordinate);
  } else {
    index.set(key, [coordinate]);
  }
};

const countryKeys = (record: StudyAreaCoordinate): string[] => [record.country, record.iso2, record.iso3].map((value) => normalizeText(value)).filter(Boolean);

const placeKeys = (record: StudyAreaCoordinate): string[] => Array.from(new Set([record.city, record.cityAscii, record.name].map((value) => normalizeText(value)).filter(Boolean)));

const buildIndexes = (coordinates: StudyAreaCoordinate[]): CoordinateIndexes => {
  const byPlaceAndCountry = new Map<string, StudyAreaCoordinate[]>();
  const byPlace = new Map<string, StudyAreaCoordinate[]>();
  coordinates.forEach((coordinate) => {
    const places = placeKeys(coordinate);
    places.forEach((place) => addToIndex(byPlace, place, coordinate));
    places.forEach((place) => countryKeys(coordinate).forEach((country) => addToIndex(byPlaceAndCountry, `${place}\u0000${country}`, coordinate)));
  });
  return { byPlaceAndCountry, byPlace };
};

let cachedIndexes: CoordinateIndexes | undefined;

const getCoordinateIndexes = (): CoordinateIndexes => {
  if (cachedIndexes) return cachedIndexes;
  if (!existsSync(DATA_PATH)) {
    cachedIndexes = { byPlaceAndCountry: new Map(), byPlace: new Map() };
    return cachedIndexes;
  }
  try {
    const raw = JSON.parse(readFileSync(DATA_PATH, "utf8")) as unknown;
    const coordinates = Array.isArray(raw) ? raw.map((record) => toCoordinate(record as RawCoordinateRecord)).filter((record): record is StudyAreaCoordinate => Boolean(record)) : [];
    cachedIndexes = buildIndexes(coordinates);
  } catch {
    cachedIndexes = { byPlaceAndCountry: new Map(), byPlace: new Map() };
  }
  return cachedIndexes;
};

const matchWithCountry = (place?: string | null, country?: string | null): StudyAreaCoordinate | undefined => {
  if (!isUsablePlace(place) || !isUsablePlace(country)) return undefined;
  const matches = getCoordinateIndexes().byPlaceAndCountry.get(`${normalizeText(place)}\u0000${normalizeText(country)}`) ?? [];
  return chooseLargestPopulation(matches);
};

const parseCityCountry = (value?: string | null): { city?: string; country?: string } => {
  if (!isUsablePlace(value) || !value?.includes(",")) return {};
  const [city, ...countryParts] = value.split(",").map((part) => part.trim()).filter(Boolean);
  return { city, country: countryParts.join(", ") || undefined };
};

const uniquePlaceOnlyMatch = (place?: string | null): StudyAreaCoordinate | undefined => {
  if (!isUsablePlace(place)) return undefined;
  const normalized = normalizeText(place);
  if (AMBIGUOUS_CITY_ONLY_NAMES.has(normalized)) return undefined;
  const matches = getCoordinateIndexes().byPlace.get(normalized) ?? [];
  const countries = new Set(matches.map((match) => normalizeText(match.country)).filter(Boolean));
  if (countries.size !== 1) return undefined;
  return chooseLargestPopulation(matches);
};

export const findStudyAreaCoordinate = (input: StudyAreaLookupInput): StudyAreaCoordinate | undefined => {
  const parsed = parseCityCountry(input.normalizedPlaceName);
  const city = input.city ?? parsed.city;
  const country = input.country ?? parsed.country;
  return (
    matchWithCountry(city, country) ??
    matchWithCountry(input.studyArea, country) ??
    (parsed.city && parsed.country ? matchWithCountry(parsed.city, parsed.country) : undefined) ??
    uniquePlaceOnlyMatch(city) ??
    uniquePlaceOnlyMatch(input.studyArea) ??
    uniquePlaceOnlyMatch(input.normalizedPlaceName)
  );
};

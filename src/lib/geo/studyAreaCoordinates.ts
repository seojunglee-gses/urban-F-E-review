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

const loadCoordinates = (): StudyAreaCoordinate[] => {
  if (!existsSync(DATA_PATH)) return [];
  try {
    const raw = JSON.parse(readFileSync(DATA_PATH, "utf8")) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map((record) => toCoordinate(record as RawCoordinateRecord)).filter((record): record is StudyAreaCoordinate => Boolean(record));
  } catch {
    return [];
  }
};

const coordinates = loadCoordinates();

const countryMatches = (record: StudyAreaCoordinate, country?: string | null): boolean => {
  const normalizedCountry = normalizeText(country);
  if (!normalizedCountry) return false;
  return [record.country, record.iso2, record.iso3].some((value) => normalizeText(value) === normalizedCountry);
};

const valueMatches = (candidate: string | null | undefined, value: string | null | undefined): boolean =>
  Boolean(isUsablePlace(candidate) && isUsablePlace(value) && normalizeText(candidate) === normalizeText(value));

const chooseLargestPopulation = (matches: StudyAreaCoordinate[]): StudyAreaCoordinate | undefined =>
  matches.sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0];

const matchWithCountry = (field: "city" | "cityAscii" | "name", place?: string | null, country?: string | null): StudyAreaCoordinate | undefined => {
  if (!isUsablePlace(place) || !isUsablePlace(country)) return undefined;
  return chooseLargestPopulation(coordinates.filter((record) => countryMatches(record, country) && valueMatches(record[field], place)));
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
  const matches = coordinates.filter((record) => [record.city, record.cityAscii, record.name].some((value) => normalizeText(value) === normalized));
  const countries = new Set(matches.map((match) => normalizeText(match.country)).filter(Boolean));
  if (countries.size !== 1) return undefined;
  return chooseLargestPopulation(matches);
};

export const findStudyAreaCoordinate = (input: StudyAreaLookupInput): StudyAreaCoordinate | undefined => {
  const parsed = parseCityCountry(input.normalizedPlaceName);
  const city = input.city ?? parsed.city;
  const country = input.country ?? parsed.country;
  return (
    matchWithCountry("city", city, country) ??
    matchWithCountry("cityAscii", city, country) ??
    matchWithCountry("name", city, country) ??
    matchWithCountry("city", input.studyArea, country) ??
    matchWithCountry("cityAscii", input.studyArea, country) ??
    matchWithCountry("name", input.studyArea, country) ??
    (parsed.city && parsed.country ? matchWithCountry("city", parsed.city, parsed.country) ?? matchWithCountry("cityAscii", parsed.city, parsed.country) ?? matchWithCountry("name", parsed.city, parsed.country) : undefined) ??
    uniquePlaceOnlyMatch(city) ??
    uniquePlaceOnlyMatch(input.studyArea) ??
    uniquePlaceOnlyMatch(input.normalizedPlaceName)
  );
};

import type { GeoMention, LocationRole } from "../../types/review";

const COUNTRY_NAMES = [
  "Australia",
  "Brazil",
  "Canada",
  "China",
  "France",
  "Germany",
  "India",
  "Italy",
  "Japan",
  "Netherlands",
  "Singapore",
  "South Africa",
  "South Korea",
  "Spain",
  "Sweden",
  "United Kingdom",
  "United States",
] as const;

const REGION_NAMES = ["Africa", "Asia", "Europe", "Latin America", "North America", "Oceania", "South America", "Southeast Asia"] as const;

const STUDY_AREA_PATTERNS = [
  /(?:case study|study area|studied in|analysis of|data from|survey in|simulation for)\s+(?:the\s+)?([A-Z][A-Za-z .'-]{2,80}?)(?:[,.;:]|\s+and\s+|\s+using\s+|\s+under\s+|$)/,
  /\bin\s+([A-Z][A-Za-z .'-]{2,80}?)(?:[,.;:]|\s+and\s+|\s+using\s+|\s+under\s+|$)/,
] as const;

const CLIMATE_ZONE_PATTERNS: Array<[string, RegExp]> = [
  ["tropical", /\btropical\b/i],
  ["arid", /\b(?:arid|hot-arid|dry)\b/i],
  ["temperate", /\btemperate\b/i],
  ["cold", /\b(?:cold|continental)\b/i],
  ["Mediterranean", /\bmediterranean\b/i],
];

const INCOME_GROUP_PATTERNS: Array<[string, RegExp]> = [
  ["high-income", /\bhigh-income\b/i],
  ["upper-middle-income", /\bupper-middle-income\b/i],
  ["lower-middle-income", /\blower-middle-income\b/i],
  ["low-income", /\blow-income\b/i],
];

const cleanLocation = (value: string): string =>
  value
    .replace(/\b(?:city|cities|urban areas?|metropolitan areas?|neighborhoods?|districts?)\b$/i, "")
    .trim();

const findCountry = (text: string): string | undefined =>
  COUNTRY_NAMES.find((country) => new RegExp(`\\b${country.replace(/ /g, "\\s+")}\\b`, "i").test(text));

const findRegion = (text: string): string | undefined =>
  REGION_NAMES.find((region) => new RegExp(`\\b${region.replace(/ /g, "\\s+")}\\b`, "i").test(text));

const findClimateZone = (text: string): string | undefined => CLIMATE_ZONE_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];

const findIncomeGroup = (text: string): string | undefined => INCOME_GROUP_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0];

const findLocalClimateZone = (text: string): string | undefined => {
  const match = text.match(/\b(?:LCZ|Local Climate Zone)\s*([A-G]|\d{1,2})\b/i);
  return match ? `LCZ ${match[1].toUpperCase()}` : undefined;
};

const classifyLocation = (location: string, text: string): { role: LocationRole; city?: string; country?: string; region?: string } => {
  const country = findCountry(location) ?? findCountry(text);
  const region = findRegion(location) ?? findRegion(text);
  if (country && location.toLowerCase() === country.toLowerCase()) return { role: "country_only", country };
  if (region && location.toLowerCase() === region.toLowerCase()) return { role: "region_only", region };
  if (location && !/^(urban|city|cities|areas?|regions?)$/i.test(location)) return { role: "study_area", city: location, country, region };
  if (country) return { role: "country_only", country, region };
  if (region) return { role: "region_only", region };
  return { role: "unknown" };
};

export const extractStudyAreaMention = ({ title, abstract }: { title: string; abstract: string | null }): GeoMention => {
  const text = `${title}. ${abstract ?? ""}`;
  const climateZone = findClimateZone(text);
  const localClimateZone = findLocalClimateZone(text);
  const incomeGroup = findIncomeGroup(text);

  for (const pattern of STUDY_AREA_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const location = cleanLocation(match[1]);
      const classified = classifyLocation(location, text);
      if (classified.role !== "unknown") {
        return {
          ...classified,
          climateZone,
          localClimateZone,
          incomeGroup,
          confidence: classified.role === "study_area" ? 0.72 : 0.62,
          source: abstract ? "abstract" : "title",
          coordinateSource: "none",
          locationRole: classified.role,
        };
      }
    }
  }

  const country = findCountry(text);
  if (country) {
    return {
      country,
      region: findRegion(text),
      climateZone,
      localClimateZone,
      incomeGroup,
      confidence: 0.55,
      source: abstract ? "abstract" : "title",
      coordinateSource: "none",
      locationRole: "country_only",
    };
  }

  const region = findRegion(text);
  if (region) {
    return {
      region,
      climateZone,
      localClimateZone,
      incomeGroup,
      confidence: 0.5,
      source: abstract ? "abstract" : "title",
      coordinateSource: "none",
      locationRole: "region_only",
    };
  }

  return {
    climateZone,
    localClimateZone,
    incomeGroup,
    confidence: 0,
    source: "unknown",
    coordinateSource: "none",
    locationRole: "unknown",
  };
};

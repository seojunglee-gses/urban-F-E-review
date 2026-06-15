import { isValidStudyAreaCity } from "./geo/locationDisplay";
import { regionForCountry } from "./geo/worldRegions";
import type { CodedPaper, GeoMention, MapDataItem, Paper } from "../types/review";

const hasCoordinates = (mention: GeoMention | undefined): mention is GeoMention & { lat: number; lon: number } =>
  typeof mention?.lat === "number" && typeof mention.lon === "number";

const locationKey = (mention: GeoMention & { lat: number; lon: number }): string =>
  [mention.city, mention.country, mention.region].filter(Boolean).join(", ") || `${mention.lat},${mention.lon}`;

const sanitizeMentionForDisplay = (mention: GeoMention & { lat: number; lon: number }, paper: Paper): GeoMention & { lat: number; lon: number } => {
  const city = isValidStudyAreaCity(mention.city) ? mention.city?.trim() : undefined;
  const country = mention.country ?? paper.studyAreaCountries?.[0];
  const region = mention.region ?? paper.studyAreaRegions?.[0] ?? regionForCountry(country);
  return { ...mention, city, country, region };
};

const COUNTRY_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  Australia: { lat: -25.27, lon: 133.78 },
  Brazil: { lat: -14.24, lon: -51.93 },
  Canada: { lat: 56.13, lon: -106.35 },
  China: { lat: 35.86, lon: 104.2 },
  France: { lat: 46.23, lon: 2.21 },
  Germany: { lat: 51.17, lon: 10.45 },
  India: { lat: 20.59, lon: 78.96 },
  Italy: { lat: 41.87, lon: 12.57 },
  Japan: { lat: 36.2, lon: 138.25 },
  Netherlands: { lat: 52.13, lon: 5.29 },
  Singapore: { lat: 1.35, lon: 103.82 },
  "South Africa": { lat: -30.56, lon: 22.94 },
  "Korea, Rep.": { lat: 35.91, lon: 127.77 },
  "South Korea": { lat: 35.91, lon: 127.77 },
  Spain: { lat: 40.46, lon: -3.75 },
  Sweden: { lat: 60.13, lon: 18.64 },
  "United Kingdom": { lat: 55.38, lon: -3.44 },
  "United States": { lat: 37.09, lon: -95.71 },
};

const mentionForMap = (mention: GeoMention | undefined): (GeoMention & { lat: number; lon: number }) | undefined => {
  if (hasCoordinates(mention)) return mention;
  const centroid = mention?.country ? COUNTRY_CENTROIDS[mention.country] : undefined;
  return mention && centroid ? { ...mention, ...centroid, coordinateSource: "map_library" } : undefined;
};

export const buildMapData = (papers: Paper[], codedPapers: CodedPaper[]): MapDataItem[] => {
  const codedByPaper = new Map(codedPapers.map((codedPaper) => [codedPaper.paperId, codedPaper]));
  const grouped = new Map<string, { mention: GeoMention & { lat: number; lon: number }; paperIds: string[]; included: number; confidence: number; topics: string[]; evidenceTexts: string[] }>();

  papers.forEach((paper) => {
    const mappedMention = mentionForMap(paper.geoMention);
    const mention = mappedMention ? sanitizeMentionForDisplay(mappedMention, paper) : undefined;
    if (!mention || mention.locationRole === "unknown") return;
    const key = locationKey(mention);
    const coded = codedByPaper.get(paper.id);
    const current = grouped.get(key) ?? { mention, paperIds: [], included: 0, confidence: 0, topics: [], evidenceTexts: [] };
    current.paperIds.push(paper.id);
    if (coded?.include) current.included += 1;
    current.confidence += mention.confidence;
    if (paper.primaryTopic) current.topics.push(paper.primaryTopic);
    if (mention.evidenceText) current.evidenceTexts.push(mention.evidenceText);
    grouped.set(key, current);
  });

  return Array.from(grouped.entries())
    .map(([key, value]) => {
      const topicCounts = new Map<string, number>();
      value.topics.forEach((topic) => topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1));
      return {
        locationKey: key,
        city: value.mention.city,
        country: value.mention.country,
        region: value.mention.region,
        lat: value.mention.lat,
        lon: value.mention.lon,
        climateZone: value.mention.climateZone,
        localClimateZone: value.mention.localClimateZone,
        incomeGroup: value.mention.incomeGroup,
        paperCount: value.paperIds.length,
        includedCount: value.included,
        averageConfidence: value.paperIds.length > 0 ? Number((value.confidence / value.paperIds.length).toFixed(2)) : 0,
        topTopics: Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([topic]) => topic),
        papers: value.paperIds,
        evidenceTexts: value.evidenceTexts.slice(0, 3),
      };
    })
    .sort((a, b) => b.paperCount - a.paperCount || a.locationKey.localeCompare(b.locationKey));
};

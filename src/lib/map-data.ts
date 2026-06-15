import { isValidStudyAreaCity } from "./geo/locationDisplay";
import { enrichCodesWithResolvedLocation, type ResolvedStudyLocation } from "./geo/resolveStudyLocation";
import { findStudyAreaCoordinate } from "./geo/studyAreaCoordinates";
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

const mentionFromResolvedLocation = (resolved: ResolvedStudyLocation | undefined): (GeoMention & { lat: number; lon: number }) | undefined => {
  if (!resolved || typeof resolved.latitude !== "number" || typeof resolved.longitude !== "number") return undefined;
  return {
    city: resolved.city ?? undefined,
    country: resolved.country ?? undefined,
    region: resolved.region ?? undefined,
    lat: resolved.latitude,
    lon: resolved.longitude,
    climateZone: resolved.climateContext ?? undefined,
    incomeGroup: resolved.incomeGroup as GeoMention["incomeGroup"],
    confidence: resolved.confidence,
    source: "manual",
    coordinateSource: "worldcities",
    locationRole: resolved.city ? "study_area" : resolved.country ? "country_only" : resolved.region ? "region_only" : "unknown",
  };
};

const mentionForMap = (mention: GeoMention | undefined): (GeoMention & { lat: number; lon: number }) | undefined => {
  if (hasCoordinates(mention)) return mention;
  if (!mention) return undefined;
  if (mention.locationRole === "study_area") {
    const coordinate = findStudyAreaCoordinate({
      city: mention.city,
      country: mention.country,
      studyArea: mention.city ?? mention.evidenceText,
      normalizedPlaceName: mention.normalizedPlaceName ?? [mention.city, mention.country].filter(Boolean).join(", "),
    });
    if (coordinate) {
      return {
        ...mention,
        city: mention.city ?? coordinate.city ?? coordinate.name,
        country: mention.country ?? coordinate.country,
        lat: coordinate.lat,
        lon: coordinate.lon,
        coordinateSource: "worldcities",
      };
    }
  }
  return undefined;
};

export const buildMapData = (papers: Paper[], codedPapers: CodedPaper[]): MapDataItem[] => {
  const codedByPaper = new Map(codedPapers.map((codedPaper) => [codedPaper.paperId, codedPaper]));
  const grouped = new Map<string, { mention: GeoMention & { lat: number; lon: number }; paperIds: string[]; included: number; confidence: number; topics: string[]; evidenceTexts: string[] }>();

  papers.forEach((paper) => {
    const coded = codedByPaper.get(paper.id);
    const resolvedMention = coded ? mentionFromResolvedLocation(enrichCodesWithResolvedLocation(coded.codes).resolvedLocation) : undefined;
    const mappedMention = resolvedMention ?? mentionForMap(paper.geoMention);
    const mention = mappedMention ? sanitizeMentionForDisplay(mappedMention, paper) : undefined;
    if (!mention || mention.locationRole === "unknown") return;
    const key = locationKey(mention);
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

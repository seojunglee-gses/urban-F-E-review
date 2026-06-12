import type { CodedPaper, GeoMention, MapDataItem, Paper } from "../types/review";

const hasCoordinates = (mention: GeoMention | undefined): mention is GeoMention & { lat: number; lon: number } =>
  typeof mention?.lat === "number" && typeof mention.lon === "number";

const locationKey = (mention: GeoMention & { lat: number; lon: number }): string =>
  [mention.city, mention.country, mention.region].filter(Boolean).join(", ") || `${mention.lat},${mention.lon}`;

export const buildMapData = (papers: Paper[], codedPapers: CodedPaper[]): MapDataItem[] => {
  const codedByPaper = new Map(codedPapers.map((codedPaper) => [codedPaper.paperId, codedPaper]));
  const grouped = new Map<string, { mention: GeoMention & { lat: number; lon: number }; paperIds: string[]; included: number; confidence: number; topics: string[]; evidenceTexts: string[] }>();

  papers.forEach((paper) => {
    const mention = paper.geoMention;
    if (!hasCoordinates(mention) || mention.locationRole !== "study_area") return;
    const key = locationKey(mention);
    const coded = codedByPaper.get(paper.id);
    const current = grouped.get(key) ?? { mention, paperIds: [], included: 0, confidence: 0, topics: [], evidenceTexts: [] };
    current.paperIds.push(paper.id);
    if (coded?.include) current.included += 1;
    current.confidence += mention.confidence;
    current.topics.push(...(coded?.codes.urbanFormVariables ?? []));
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

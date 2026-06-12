import type { CodedPaper, MapDataItem, Paper } from "../types/review";

export const buildMapData = (papers: Paper[], codedPapers: CodedPaper[]): MapDataItem[] => {
  const codedByPaper = new Map(codedPapers.map((codedPaper) => [codedPaper.paperId, codedPaper]));
  const grouped = new Map<string, { paperIds: string[]; included: number; confidence: number; topics: string[] }>();

  papers.forEach((paper) => {
    const countries = paper.countries.length > 0 ? paper.countries : ["Unknown"];
    const coded = codedByPaper.get(paper.id);
    countries.forEach((country) => {
      const current = grouped.get(country) ?? { paperIds: [], included: 0, confidence: 0, topics: [] };
      current.paperIds.push(paper.id);
      if (coded?.include) current.included += 1;
      current.confidence += coded?.confidence ?? 0;
      current.topics.push(...(coded?.codes.urbanFormVariables ?? paper.concepts.slice(0, 2)));
      grouped.set(country, current);
    });
  });

  return Array.from(grouped.entries())
    .map(([country, value]) => {
      const topicCounts = new Map<string, number>();
      value.topics.forEach((topic) => topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1));
      return {
        country,
        paperCount: value.paperIds.length,
        includedCount: value.included,
        averageConfidence: value.paperIds.length > 0 ? Number((value.confidence / value.paperIds.length).toFixed(2)) : 0,
        topTopics: Array.from(topicCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([topic]) => topic),
        papers: value.paperIds,
      };
    })
    .sort((a, b) => b.paperCount - a.paperCount || a.country.localeCompare(b.country));
};

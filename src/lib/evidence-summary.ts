import { incomeGroupDisplayOrder } from "./geo/incomeGroups";
import { isValidStudyAreaCity } from "./geo/locationDisplay";
import { enrichCodesWithResolvedLocation } from "./geo/resolveStudyLocation";
import type { ChartData, CodedPaper, CountValue, EvidenceSummary, GapMapItem, Paper } from "../types/review";

const increment = (counts: Record<string, number>, key: string | undefined): void => {
  const normalized = key?.trim() || "unclear";
  counts[normalized] = (counts[normalized] ?? 0) + 1;
};

const topCounts = (counts: Record<string, number>, limit = 8): CountValue[] =>
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));

export const buildChartData = (papers: Paper[], codedPapers: CodedPaper[], openAlexTopics: CountValue[] = []): ChartData => {
  const yearCounts: Record<string, number> = {};
  const urbanFormCounts: Record<string, number> = {};
  const energyCounts: Record<string, number> = {};
  const methodCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};
  const cityCounts: Record<string, number> = {};
  const regionCounts: Record<string, number> = {};
  const climateZoneCounts: Record<string, number> = {};
  const incomeGroupCounts: Record<string, number> = Object.fromEntries(incomeGroupDisplayOrder().map((group) => [group, 0]));
  const locationRoleCounts: Record<string, number> = {};
  const scaleCounts: Record<string, number> = {};
  const primaryTopicCounts: Record<string, number> = {};

  const codedByPaper = new Map(codedPapers.map((codedPaper) => [codedPaper.paperId, codedPaper]));
  papers.forEach((paper) => {
    const resolved = codedByPaper.get(paper.id) ? enrichCodesWithResolvedLocation(codedByPaper.get(paper.id)!.codes).resolvedLocation : undefined;
    increment(yearCounts, String(paper.year ?? "unknown"));
    increment(locationRoleCounts, resolved && resolved.matchLevel !== "unresolved" ? resolved.matchLevel : paper.geoMention?.locationRole ?? "unknown");
    const countries = resolved?.country ? [resolved.country] : paper.studyAreaCountries?.length ? paper.studyAreaCountries : paper.geoMention?.country ? [paper.geoMention.country] : [];
    const regions = resolved?.region ? [resolved.region] : paper.studyAreaRegions?.length ? paper.studyAreaRegions : paper.geoMention?.region ? [paper.geoMention.region] : [];
    const candidateCities = resolved?.city ? [resolved.city] : paper.studyAreaCities?.length ? paper.studyAreaCities : paper.geoMention?.city ? [paper.geoMention.city] : [];
    const cities = candidateCities.filter(isValidStudyAreaCity);
    (countries.length ? countries : [paper.geoMention?.locationRole === "unknown" ? "No study-area country" : undefined]).forEach((country) => increment(countryCounts, country));
    (regions.length ? regions : [undefined]).forEach((region) => increment(regionCounts, region));
    cities.forEach((city) => increment(cityCounts, city));
    increment(climateZoneCounts, resolved?.climateContext ?? paper.geoMention?.climateZone ?? "Unknown climate zone");
    increment(incomeGroupCounts, resolved?.country ? resolved.incomeGroup ?? "Country needs income lookup" : paper.geoMention?.country ? paper.geoMention.incomeGroup ?? "Country needs income lookup" : "No study-area country");
    increment(primaryTopicCounts, paper.primaryTopic ?? "No primary topic");
  });
  codedPapers.forEach((codedPaper) => {
    codedPaper.codes.urbanFormVariables.forEach((value) => increment(urbanFormCounts, value));
    codedPaper.codes.energyOutcomes.forEach((value) => increment(energyCounts, value));
    increment(methodCounts, codedPaper.codes.method);
    increment(scaleCounts, codedPaper.codes.spatialScale);
  });

  return {
    yearlyTrend: topCounts(yearCounts, 40).sort((a, b) => a.name.localeCompare(b.name)),
    urbanFormVariables: topCounts(urbanFormCounts),
    energyOutcomes: topCounts(energyCounts),
    methods: topCounts(methodCounts),
    countries: topCounts(countryCounts),
    cities: topCounts(cityCounts),
    regions: topCounts(regionCounts),
    climateZones: topCounts(climateZoneCounts),
    incomeGroups: [
      ...incomeGroupDisplayOrder().map((name) => ({ name, count: incomeGroupCounts[name] ?? 0 })),
      ...topCounts(incomeGroupCounts).filter((item) => !(incomeGroupDisplayOrder() as string[]).includes(item.name)),
    ],
    locationRoles: topCounts(locationRoleCounts),
    spatialScales: topCounts(scaleCounts),
    openAlexTopics: topCounts(primaryTopicCounts, 10).length ? topCounts(primaryTopicCounts, 10) : openAlexTopics,
  };
};

export const buildEvidenceSummary = (papers: Paper[], codedPapers: CodedPaper[]): EvidenceSummary => {
  const chartData = buildChartData(papers, codedPapers);
  const includedPapers = codedPapers.filter((paper) => paper.include).length;
  const manualReviewCount = codedPapers.filter((paper) => paper.needsManualReview).length;
  return {
    totalPapers: papers.length,
    includedPapers,
    excludedPapers: Math.max(0, codedPapers.length - includedPapers),
    manualReviewCount,
    topUrbanFormVariables: chartData.urbanFormVariables,
    topEnergyOutcomes: chartData.energyOutcomes,
    topMethods: chartData.methods,
    topCountries: chartData.countries,
    topSpatialScales: chartData.spatialScales,
    mainFindings: chartData.urbanFormVariables.slice(0, 3).map((item) => `${item.name} appears in ${item.count} coded papers.`),
    limitations: [
      "Map markers include only extracted study-area locations with coordinates; author affiliations are not mapped.",
      manualReviewCount > 0 ? `${manualReviewCount} papers require manual review because abstracts or coding confidence are limited.` : "Automated coding should still be reviewed before publication.",
    ],
  };
};

const countPair = (codedPapers: CodedPaper[], getA: (paper: CodedPaper) => string[], getB: (paper: CodedPaper) => string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  codedPapers.filter((paper) => paper.include).forEach((paper) => {
    getA(paper).forEach((valueA) => {
      getB(paper).forEach((valueB) => {
        const key = `${valueA}|||${valueB}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    });
  });
  return counts;
};

const buildGapItems = ({
  dimensionA,
  valuesA,
  dimensionB,
  valuesB,
  counts,
}: {
  dimensionA: string;
  valuesA: string[];
  dimensionB: string;
  valuesB: string[];
  counts: Map<string, number>;
}): GapMapItem[] => {
  const gaps: GapMapItem[] = [];
  valuesA.filter((value) => value !== "unclear").slice(0, 6).forEach((valueA) => {
    valuesB.filter((value) => value !== "unclear").slice(0, 6).forEach((valueB) => {
      const paperCount = counts.get(`${valueA}|||${valueB}`) ?? 0;
      if (paperCount <= 1) {
        gaps.push({
          dimensionA,
          valueA,
          dimensionB,
          valueB,
          paperCount,
          gapType: paperCount === 0 ? "missing" : "understudied",
          recommendation: `Prioritize studies connecting ${valueA} with ${valueB}.`,
        });
      }
    });
  });
  return gaps;
};

export const buildGapMap = (codedPapers: CodedPaper[], chartData: ChartData): GapMapItem[] => {
  const urbanForms = chartData.urbanFormVariables.map((item) => item.name);
  const outcomes = chartData.energyOutcomes.map((item) => item.name);
  const methods = chartData.methods.map((item) => item.name);
  const scales = chartData.spatialScales.map((item) => item.name);
  const countries = chartData.countries.map((item) => item.name);
  const formOutcome = countPair(codedPapers, (paper) => paper.codes.urbanFormVariables, (paper) => paper.codes.energyOutcomes);
  const countryOutcome = countPair(codedPapers, (paper) => {
    const resolved = enrichCodesWithResolvedLocation(paper.codes).resolvedLocation;
    return [resolved.country ?? resolved.region ?? paper.codes.country];
  }, (paper) => paper.codes.energyOutcomes);
  const scaleMethod = countPair(codedPapers, (paper) => [paper.codes.spatialScale], (paper) => [paper.codes.method]);
  const gaps = [
    ...buildGapItems({ dimensionA: "urban form variable", valuesA: urbanForms, dimensionB: "energy outcome", valuesB: outcomes, counts: formOutcome }),
    ...buildGapItems({ dimensionA: "study-area country/region", valuesA: countries, dimensionB: "energy outcome", valuesB: outcomes, counts: countryOutcome }),
    ...buildGapItems({ dimensionA: "spatial scale", valuesA: scales, dimensionB: "method", valuesB: methods, counts: scaleMethod }),
  ];
  codedPapers.filter((paper) => paper.needsManualReview).slice(0, 5).forEach((paper) => {
    gaps.push({
      dimensionA: "paper",
      valueA: paper.paperId,
      dimensionB: "coding confidence",
      valueB: "manual review",
      paperCount: 1,
      gapType: "low confidence",
      recommendation: "Manually review this paper before final synthesis.",
    });
  });
  return gaps.slice(0, 20);
};

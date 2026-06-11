import type {
  EvidenceMapSummary,
  EvidenceMatrixCell,
  GeneratedCodebook,
  LLMClassification,
  MethodologyType,
  NormalizedAbstractRecord,
  RelationshipType,
  ResearchGap,
  SpatialScale,
  TopicCluster,
} from "../../types/literature";

const relationshipTypes: RelationshipType[] = [
  "positive",
  "negative",
  "mixed",
  "nonlinear",
  "context-dependent",
  "no-clear-relationship",
  "not-applicable",
];

const scaleTypes: SpatialScale[] = [
  "building",
  "block",
  "neighborhood",
  "city",
  "metropolitan",
  "regional",
  "multi-scalar",
  "unclear",
];

const methodologyTypes: MethodologyType[] = [
  "simulation",
  "empirical-observational",
  "statistical-modeling",
  "machine-learning",
  "remote-sensing-gis",
  "review",
  "conceptual",
  "mixed-methods",
  "unclear",
];

const increment = <T extends string>(
  counts: Record<T, number>,
  key: T,
): void => {
  counts[key] = (counts[key] ?? 0) + 1;
};

const incrementString = (counts: Record<string, number>, key: string): void => {
  const normalized = key.trim() || "Unspecified";
  counts[normalized] = (counts[normalized] ?? 0) + 1;
};

const sortCounts = (counts: Record<string, number>): Record<string, number> =>
  Object.fromEntries(
    Object.entries(counts).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    ),
  );

const buildMatrix = (
  classifications: LLMClassification[],
): EvidenceMatrixCell[] => {
  const cells = new Map<string, EvidenceMatrixCell>();
  classifications.forEach((classification) => {
    classification.urbanFormVariables.forEach((urbanFormVariable) => {
      classification.energyOutcomes.forEach((energyOutcome) => {
        const key = `${urbanFormVariable}__${energyOutcome}`;
        const current = cells.get(key) ?? {
          urbanFormVariable,
          energyOutcome,
          count: 0,
          recordIds: [],
        };
        current.count += 1;
        current.recordIds.push(classification.recordId);
        cells.set(key, current);
      });
    });
  });
  return Array.from(cells.values()).sort(
    (a, b) =>
      a.urbanFormVariable.localeCompare(b.urbanFormVariable) ||
      a.energyOutcome.localeCompare(b.energyOutcome),
  );
};

const leastRepresented = (
  counts: Record<string, number>,
  label: string,
): ResearchGap[] => {
  const values = Object.entries(counts).filter(([, count]) => count > 0);
  if (values.length < 2) return [];
  const max = Math.max(...values.map(([, count]) => count));
  return values
    .filter(([, count]) => count <= Math.max(1, Math.floor(max * 0.25)))
    .slice(0, 3)
    .map(([name, count], index) => ({
      id: `${label}-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      type:
        label === "methodology"
          ? "methodology"
          : label === "geography"
            ? "geography"
            : label === "energy"
              ? "energy-outcome"
              : "urban-form",
      statement: `${name} is weakly represented with ${count} classified record${count === 1 ? "" : "s"}.`,
      severity: count === 1 ? "high" : "medium",
      relatedRecordIds: [],
    }));
};

const buildResearchGaps = (
  summary: Omit<EvidenceMapSummary, "researchGaps">,
): ResearchGap[] => {
  const gaps: ResearchGap[] = [];
  gaps.push(...leastRepresented(summary.urbanFormCounts, "urban-form"));
  gaps.push(...leastRepresented(summary.energyOutcomeCounts, "energy"));
  gaps.push(...leastRepresented(summary.geographyCounts, "geography"));
  gaps.push(...leastRepresented(summary.methodologyCounts, "methodology"));

  const weakCells = summary.evidenceMatrix
    .filter((cell) => cell.count <= 1)
    .slice(0, 5)
    .map<ResearchGap>((cell, index) => ({
      id: `matrix-cell-${index}-${cell.urbanFormVariable}-${cell.energyOutcome}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-"),
      type: "matrix-cell",
      statement: `Sparse evidence for ${cell.urbanFormVariable} × ${cell.energyOutcome} (${cell.count} record).`,
      severity: "medium",
      relatedRecordIds: cell.recordIds,
    }));
  gaps.push(...weakCells);

  const geographyTotal = Object.values(summary.geographyCounts).reduce(
    (sum, count) => sum + count,
    0,
  );
  const unspecified = summary.geographyCounts.Unspecified ?? 0;
  if (geographyTotal > 0 && unspecified / geographyTotal > 0.2) {
    gaps.push({
      id: "geography-unspecified",
      type: "geography",
      statement:
        "More than 20% of classifications have unspecified geography; improve location extraction before GHSL joins.",
      severity: "medium",
      relatedRecordIds: [],
    });
  }

  return gaps.slice(0, 12);
};

export const buildEvidenceMap = ({
  records,
  topicClusters,
  codebook,
  classifications,
}: {
  records: NormalizedAbstractRecord[];
  topicClusters: TopicCluster[];
  codebook: GeneratedCodebook | null;
  classifications: LLMClassification[];
}): EvidenceMapSummary => {
  const yearCounts: Record<string, number> = {};
  const topicCounts: Record<string, number> = {};
  const urbanFormCounts: Record<string, number> = {};
  const energyOutcomeCounts: Record<string, number> = {};
  const relationshipCounts = Object.fromEntries(
    relationshipTypes.map((type) => [type, 0]),
  ) as Record<RelationshipType, number>;
  const scaleCounts = Object.fromEntries(
    scaleTypes.map((type) => [type, 0]),
  ) as Record<SpatialScale, number>;
  const methodologyCounts = Object.fromEntries(
    methodologyTypes.map((type) => [type, 0]),
  ) as Record<MethodologyType, number>;
  const geographyCounts: Record<string, number> = {};

  records.forEach((record) =>
    incrementString(yearCounts, String(record.year ?? "Unknown")),
  );
  topicClusters.forEach((topic) => {
    topicCounts[topic.label] = topic.representativeRecordIds.length;
  });

  classifications.forEach((classification) => {
    classification.urbanFormVariables.forEach((item) =>
      incrementString(urbanFormCounts, item),
    );
    classification.energyOutcomes.forEach((item) =>
      incrementString(energyOutcomeCounts, item),
    );
    increment(relationshipCounts, classification.relationshipType);
    increment(scaleCounts, classification.scale);
    increment(methodologyCounts, classification.methodology);
    classification.geography.forEach((item) =>
      incrementString(geographyCounts, item),
    );
  });

  const evidenceMatrix = buildMatrix(classifications);
  const lowConfidenceRecordIds = classifications
    .filter((classification) => classification.confidence < 0.6)
    .map((classification) => classification.recordId);

  const includedRecords = records.filter(
    (record) => record.screeningStatus === "included",
  ).length;
  const summaryWithoutGaps = {
    totalRecords: records.length,
    includedRecords,
    yearCounts: sortCounts(yearCounts),
    topicCounts: sortCounts(topicCounts),
    urbanFormCounts: sortCounts(urbanFormCounts),
    energyOutcomeCounts: sortCounts(energyOutcomeCounts),
    relationshipCounts,
    scaleCounts,
    methodologyCounts,
    geographyCounts: sortCounts(geographyCounts),
    evidenceMatrix,
    lowConfidenceRecordIds,
  };

  const codebookWarnings = codebook?.warnings.length ?? 0;
  const researchGaps = buildResearchGaps(summaryWithoutGaps);
  if (codebookWarnings > 0) {
    researchGaps.push({
      id: "codebook-warnings",
      type: "methodology",
      statement:
        "Generated codebook contains warnings; review category definitions before final synthesis.",
      severity: "low",
      relatedRecordIds: [],
    });
  }

  return {
    ...summaryWithoutGaps,
    researchGaps,
  };
};

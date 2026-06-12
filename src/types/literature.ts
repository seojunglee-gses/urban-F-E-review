export type ScreeningStatus = "included" | "excluded" | "uncertain";

export type RelationshipType =
  | "positive"
  | "negative"
  | "mixed"
  | "nonlinear"
  | "context-dependent"
  | "no-clear-relationship"
  | "not-applicable";

export type SpatialScale =
  | "building"
  | "block"
  | "neighborhood"
  | "city"
  | "metropolitan"
  | "regional"
  | "multi-scalar"
  | "unclear";

export type MethodologyType =
  | "simulation"
  | "empirical-observational"
  | "statistical-modeling"
  | "machine-learning"
  | "remote-sensing-gis"
  | "review"
  | "conceptual"
  | "mixed-methods"
  | "unclear";

export type SectorType =
  | "building-heating"
  | "building-cooling"
  | "building-electricity"
  | "transport-energy"
  | "total-urban-energy"
  | "emissions"
  | "microclimate-mediated-energy"
  | "unclear";

export type PipelineStageStatus = "idle" | "running" | "success" | "error";

export interface WosSearchConfig {
  query: string;
  keywords: string[];
  yearStart: number;
  yearEnd: number;
  language: string;
  sourceTypes: string[];
  searchFields: string[];
  count: number;
  firstRecord: number;
}

export interface WosRawRecord {
  uid?: string;
  UT?: string;
  static_data?: unknown;
  dynamic_data?: unknown;
  titles?: unknown;
  names?: unknown;
  keywords?: unknown;
  [key: string]: unknown;
}

export interface BibliographicRecord {
  id: string;
  uid: string;
  title: string;
  authors: string[];
  year: number | null;
  journal: string;
  doi: string;
  abstract: string;
  authorKeywords: string[];
  keywordsPlus: string[];
  sourceDatabase: string;
  documentType: string;
  timesCited: number | null;
  affiliations: string[];
  countries: string[];
  raw: WosRawRecord;
}

export interface NormalizedAbstractRecord {
  id: string;
  title: string;
  abstract: string;
  year: number | null;
  doi: string;
  authors: string[];
  journal: string;
  keywords: string[];
  candidateLocations: string[];
  normalizedText: string;
  screeningStatus: ScreeningStatus;
  exclusionReason?: string;
}

export interface TopicModelResult {
  id: string;
  createdAt: string;
  sourceRecordCount: number;
  clusters: TopicCluster[];
  warnings: string[];
  mockMode: boolean;
}

export interface TopicCluster {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  representativeRecordIds: string[];
  urbanFormSignals: string[];
  energyOutcomeSignals: string[];
  mechanismSignals: string[];
  confidence: number;
}

export interface GeneratedCodebook {
  id: string;
  createdAt: string;
  sourceRecordCount: number;
  dimensions: CodebookDimension[];
  notes: string[];
  warnings: string[];
}

export interface CodebookDimension {
  id: string;
  name: string;
  description: string;
  categories: CodebookCategory[];
}

export interface CodebookCategory {
  id: string;
  label: string;
  definition: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  examples: string[];
  relatedTopicIds: string[];
}

export interface LLMClassification {
  recordId: string;
  urbanFormVariables: string[];
  energyOutcomes: string[];
  relationshipType: RelationshipType;
  mechanisms: string[];
  planningImplications: string[];
  scale: SpatialScale;
  methodology: MethodologyType;
  geography: string[];
  climateContext: string;
  sector: SectorType;
  confidence: number;
  evidenceQuote: string;
  uncertaintyNotes: string[];
}

export interface EvidenceMatrixCell {
  urbanFormVariable: string;
  energyOutcome: string;
  count: number;
  recordIds: string[];
}

export interface ResearchGap {
  id: string;
  type:
    | "urban-form"
    | "energy-outcome"
    | "geography"
    | "methodology"
    | "matrix-cell";
  statement: string;
  severity: "low" | "medium" | "high";
  relatedRecordIds: string[];
}

export interface EvidenceMapSummary {
  totalRecords: number;
  includedRecords: number;
  yearCounts: Record<string, number>;
  topicCounts: Record<string, number>;
  urbanFormCounts: Record<string, number>;
  energyOutcomeCounts: Record<string, number>;
  relationshipCounts: Record<RelationshipType, number>;
  scaleCounts: Record<SpatialScale, number>;
  methodologyCounts: Record<MethodologyType, number>;
  geographyCounts: Record<string, number>;
  evidenceMatrix: EvidenceMatrixCell[];
  researchGaps: ResearchGap[];
  lowConfidenceRecordIds: string[];
}

export interface StageRunState {
  status: PipelineStageStatus;
  count: number;
  error?: string;
}

export interface PipelineRunState {
  retrieve: StageRunState;
  normalize: StageRunState;
  topics: StageRunState;
  codebook: StageRunState;
  classify: StageRunState;
  map: StageRunState;
}

export interface ApiErrorResponse {
  error: string;
  code:
    | "missing-api-key"
    | "invalid-request"
    | "rate-limited"
    | "no-records"
    | "missing-abstracts"
    | "llm-json-parse"
    | "network-error"
    | "server-error";
  actionableMessage: string;
  warnings?: string[];
}

export interface WosSearchResponse {
  records: BibliographicRecord[];
  total: number;
  query: string;
  warnings: string[];
  mockMode: boolean;
  apiKeyDetected: boolean;
}

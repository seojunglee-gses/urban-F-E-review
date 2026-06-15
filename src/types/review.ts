export type PaperSource = "openalex" | "web-of-science";
export type PipelineStepStatus = "success" | "skipped" | "failed";
export type EvidenceStrength = "low" | "medium" | "high" | "unclear";
export type LocationRole = "study_area" | "country_only" | "region_only" | "unknown";
export type GeoMentionSource = "llm" | "title" | "abstract" | "geocoder" | "manual" | "unknown";
export type CoordinateSource = "geocoding_api" | "map_library" | "worldcities" | "country_centroid" | "none";
export type IncomeGroup = "Low income" | "Lower middle income" | "Upper middle income" | "High income" | "Unknown";

export interface GeoMention {
  city?: string;
  country?: string;
  region?: string;
  lat?: number;
  lon?: number;
  climateZone?: string;
  localClimateZone?: string;
  incomeGroup?: IncomeGroup;
  confidence: number;
  source: GeoMentionSource;
  coordinateSource: CoordinateSource;
  locationRole: LocationRole;
  evidenceText?: string;
  normalizedPlaceName?: string;
}

export interface StudyAreaExtractionResult {
  hasStudyArea: boolean;
  city?: string;
  country?: string;
  region?: string;
  locationRole: LocationRole;
  confidence: number;
  evidenceText?: string;
  normalizedPlaceName?: string;
}

export interface Paper {
  id: string;
  openAlexId: string;
  title: string;
  year: number | null;
  doi: string | null;
  journal: string | null;
  authors: string[];
  countries: string[];
  institutions: string[];
  concepts: string[];
  abstract: string | null;
  url: string | null;
  citedByCount?: number;
  primaryTopic?: string | null;
  studyAreaCountries?: string[];
  studyAreaRegions?: string[];
  studyAreaCities?: string[];
  source: PaperSource;
  geoMention?: GeoMention;
}

export interface CodebookVariable {
  name: string;
  definition: string;
  type: "categorical" | "numeric" | "text" | "boolean";
  allowedValues: string[];
  extractionRule: string;
  examples: string[];
}

export interface ReviewCodebook {
  researchQuestion: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  variables: CodebookVariable[];
  extractionRules: string[];
  codingInstructions: string[];
  qualityChecks: string[];
}

export interface PaperCodes {
  urbanFormVariables: string[];
  energyOutcomes: string[];
  method: string;
  spatialScale: string;
  climateContext: string;
  studyLocation: string;
  country: string;
  buildingType: string;
  keyFinding: string;
  evidenceStrength: EvidenceStrength;
}

export interface CodedPaper {
  paperId: string;
  include: boolean;
  exclusionReason: string | null;
  codes: PaperCodes;
  confidence: number;
  needsManualReview: boolean;
}

export interface CountValue {
  name: string;
  count: number;
}

export interface EvidenceSummary {
  totalPapers: number;
  includedPapers: number;
  excludedPapers: number;
  manualReviewCount: number;
  topUrbanFormVariables: CountValue[];
  topEnergyOutcomes: CountValue[];
  topMethods: CountValue[];
  topCountries: CountValue[];
  topSpatialScales: CountValue[];
  mainFindings: string[];
  limitations: string[];
}

export interface GapMapItem {
  dimensionA: string;
  valueA: string;
  dimensionB: string;
  valueB: string;
  paperCount: number;
  gapType: "understudied" | "missing" | "low confidence";
  recommendation: string;
}

export interface MapDataItem {
  locationKey: string;
  city?: string;
  country?: string;
  region?: string;
  lat: number;
  lon: number;
  climateZone?: string;
  localClimateZone?: string;
  incomeGroup?: IncomeGroup;
  paperCount: number;
  includedCount: number;
  averageConfidence: number;
  topTopics: string[];
  papers: string[];
  evidenceTexts: string[];
}

export interface ChartData {
  yearlyTrend: CountValue[];
  urbanFormVariables: CountValue[];
  energyOutcomes: CountValue[];
  methods: CountValue[];
  countries: CountValue[];
  cities: CountValue[];
  regions: CountValue[];
  climateZones: CountValue[];
  incomeGroups: CountValue[];
  locationRoles: CountValue[];
  spatialScales: CountValue[];
  openAlexTopics: CountValue[];
}

export interface ReviewRunStatus {
  search: PipelineStepStatus;
  codebook: PipelineStepStatus;
  coding: PipelineStepStatus;
  summary: PipelineStepStatus;
}

export interface ReviewRunRequest {
  query: string;
  researchQuestion?: string;
  maxResults?: number;
}

export interface ReviewRunResponse {
  query: string;
  researchQuestion: string;
  status: ReviewRunStatus;
  papers: Paper[];
  codebook: ReviewCodebook | null;
  codedPapers: CodedPaper[];
  evidenceSummary: EvidenceSummary | null;
  gapMap: GapMapItem[];
  mapData: MapDataItem[];
  chartData: ChartData;
  errors: string[];
}

export interface OpenAlexWork {
  id?: string;
  doi?: string | null;
  title?: string | null;
  display_name?: string | null;
  publication_year?: number | null;
  primary_location?: unknown;
  locations?: unknown[];
  authorships?: unknown[];
  concepts?: unknown[];
  abstract_inverted_index?: Record<string, number[]> | null;
  cited_by_count?: number;
  landing_page_url?: string | null;
  primary_topic?: unknown;
}

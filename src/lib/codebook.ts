import type { CodebookVariable, Paper, ReviewCodebook } from "../types/review";

const variable = (
  name: string,
  definition: string,
  type: CodebookVariable["type"],
  allowedValues: string[],
  extractionRule: string,
  examples: string[],
): CodebookVariable => ({ name, definition, type, allowedValues, extractionRule, examples });

export const buildFallbackCodebook = (researchQuestion: string): ReviewCodebook => ({
  researchQuestion,
  inclusionCriteria: [
    "Paper studies an urban form, morphology, land-use, building geometry, greenery, or spatial planning variable.",
    "Paper reports or models an energy, emissions, heating, cooling, electricity, or transport-energy outcome.",
    "Title or abstract provides enough information for abstract-level screening.",
  ],
  exclusionCriteria: [
    "No urban form or spatial planning variable is present.",
    "No energy or emissions outcome is present.",
    "The record is not about cities, buildings, urban climate, or transport systems.",
  ],
  variables: [
    variable("urban form variable", "Urban form exposure or morphology measured in the paper.", "categorical", ["density", "compactness", "land-use mix", "street network", "building morphology", "greenery", "urban heat island", "unclear"], "Extract only variables explicitly supported by title or abstract.", ["density", "urban canyon", "tree canopy"]),
    variable("energy outcome", "Energy, demand, consumption, emissions, or thermal-energy outcome.", "categorical", ["heating demand", "cooling demand", "electricity use", "building energy", "transport energy", "emissions", "unclear"], "Use unclear if an energy endpoint is not explicit.", ["cooling electricity", "transport energy"]),
    variable("spatial scale", "Main spatial scale of analysis.", "categorical", ["building", "block", "neighborhood", "city", "metropolitan", "regional", "unclear"], "Infer from abstract only when explicit.", ["neighborhood", "city"]),
    variable("study location", "Named city, region, or study area.", "text", [], "Extract named places only.", ["London", "China"]),
    variable("country", "Study-area country extracted from the title or abstract, not author affiliation.", "text", [], "Use only the study-area country; use unclear if no study-area country is explicit.", ["China"]),
    variable("income group", "World Bank income group for the study-area country.", "categorical", ["High income", "Upper middle income", "Lower middle income", "Low income", "Unknown"], "Do not infer this with the LLM. Assign it only from the World Bank income-group lookup after the study-area country is resolved.", ["High income"]),
    variable("climate context", "Climate context linked to the extracted study-area city/country.", "categorical", ["hot-arid", "tropical", "temperate", "cold", "Mediterranean", "unclear"], "First use explicit climate descriptors. If a study-area city/country is resolved, the application may fill this by a city/country climate lookup so the LLM does not spend tokens inferring it from the full abstract.", ["tropical"]),
    variable("method", "Dominant study method.", "categorical", ["simulation", "empirical-observational", "statistical-modeling", "machine-learning", "remote-sensing-gis", "review", "unclear"], "Classify based on abstract method terms.", ["simulation", "review"]),
    variable("building type", "Building stock or typology studied.", "text", [], "Use unclear if not present.", ["residential", "office"]),
    variable("key finding direction", "Direction or character of the relationship.", "categorical", ["positive", "negative", "mixed", "context-dependent", "unclear"], "Do not infer beyond abstract evidence.", ["mixed"]),
    variable("evidence strength", "Confidence in abstract-level evidence.", "categorical", ["low", "medium", "high", "unclear"], "Base on abstract specificity and methodological clarity.", ["medium"]),
  ],
  extractionRules: [
    "Use title and abstract evidence only.",
    "Do not hallucinate locations, methods, or energy outcomes.",
    "Use unclear when information is insufficient.",
  ],
  codingInstructions: [
    "Screen for urban-form and energy relevance before coding.",
    "Flag missing abstracts and low-confidence records for manual review.",
  ],
  qualityChecks: [
    "Every included paper should have at least one urban form variable and one energy outcome.",
    "Evidence quote or key finding must be traceable to title/abstract.",
  ],
});

export const samplePapersForCodebook = (papers: Paper[], limit = 15): Array<Pick<Paper, "title" | "abstract" | "year">> =>
  papers
    .filter((paper) => Boolean(paper.abstract))
    .slice(0, limit)
    .map((paper) => ({ title: paper.title, abstract: paper.abstract, year: paper.year }));

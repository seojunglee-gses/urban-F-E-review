import { enrichCodesWithResolvedLocation } from "./geo/resolveStudyLocation";
import type { CodedPaper, EvidenceStrength, Paper, ReviewCodebook } from "../types/review";

const includesAny = (text: string, terms: string[]): boolean => terms.some((term) => text.includes(term));

const collect = (text: string, options: Array<{ label: string; terms: string[] }>, fallback = "unclear"): string[] => {
  const values = options.filter((option) => includesAny(text, option.terms)).map((option) => option.label);
  return values.length > 0 ? values : [fallback];
};

const inferMethod = (text: string): string => {
  if (includesAny(text, ["simulation", "model", "energyplus", "envi-met", "urban weather generator"])) return "simulation";
  if (includesAny(text, ["machine learning", "random forest", "gradient boosting", "neural"])) return "machine-learning";
  if (includesAny(text, ["remote sensing", "gis", "satellite", "land surface temperature"])) return "remote-sensing-gis";
  if (includesAny(text, ["regression", "statistical", "econometric"])) return "statistical-modeling";
  if (includesAny(text, ["review", "systematic review", "meta-analysis"])) return "review";
  if (includesAny(text, ["observed", "measured", "utility", "survey", "empirical"])) return "empirical-observational";
  return "unclear";
};

const inferScale = (text: string): string => {
  if (text.includes("building")) return "building";
  if (includesAny(text, ["block", "street canyon", "street"])) return "block";
  if (includesAny(text, ["neighborhood", "district"])) return "neighborhood";
  if (includesAny(text, ["metropolitan", "region"])) return "metropolitan";
  if (includesAny(text, ["city", "urban"])) return "city";
  return "unclear";
};

const inferEvidenceStrength = (paper: Paper, text: string): EvidenceStrength => {
  if (!paper.abstract) return "unclear";
  if (paper.abstract.length > 900 && inferMethod(text) !== "unclear") return "high";
  if (paper.abstract.length > 300) return "medium";
  return "low";
};

export const codePaperDeterministically = (paper: Paper, codebook: ReviewCodebook | null): CodedPaper => {
  const text = `${paper.title} ${paper.abstract ?? ""} ${paper.concepts.join(" ")}`.toLowerCase();
  const missingAbstract = !paper.abstract;
  const urbanFormVariables = collect(text, [
    { label: "density", terms: ["density", "compact"] },
    { label: "land-use mix", terms: ["land use", "mixed use"] },
    { label: "street network", terms: ["street", "connectivity", "walkability"] },
    { label: "building morphology", terms: ["morphology", "building geometry", "3d", "height"] },
    { label: "greenery", terms: ["green", "vegetation", "tree", "canopy"] },
    { label: "urban heat island", terms: ["heat island", "urban climate", "urban meteorology"] },
  ]);
  const energyOutcomes = collect(text, [
    { label: "heating demand", terms: ["heating", "heat demand"] },
    { label: "cooling demand", terms: ["cooling", "air conditioning"] },
    { label: "electricity use", terms: ["electricity", "utility"] },
    { label: "building energy", terms: ["building energy", "energy demand", "energy consumption"] },
    { label: "transport energy", terms: ["transport", "travel energy", "mobility"] },
    { label: "emissions", terms: ["emissions", "carbon"] },
  ]);
  const method = inferMethod(text);
  const spatialScale = inferScale(text);
  const evidenceStrength = inferEvidenceStrength(paper, text);
  const include = !missingAbstract && !urbanFormVariables.includes("unclear") && !energyOutcomes.includes("unclear");
  const confidence = missingAbstract ? 0.15 : include ? (evidenceStrength === "high" ? 0.82 : 0.68) : 0.42;
  const country = paper.geoMention?.country ?? "unclear";
  const studyLocation = [paper.geoMention?.city, paper.geoMention?.country, paper.geoMention?.region].filter(Boolean).join("; ") || "unclear";

  return {
    paperId: paper.id,
    include,
    exclusionReason: include ? null : missingAbstract ? "Missing abstract" : "Urban form and energy relationship is unclear in abstract",
    codes: enrichCodesWithResolvedLocation({
      urbanFormVariables,
      energyOutcomes,
      method,
      spatialScale,
      climateContext: paper.geoMention?.climateZone ?? (includesAny(text, ["tropical"]) ? "tropical" : includesAny(text, ["cold"]) ? "cold" : includesAny(text, ["mediterranean"]) ? "Mediterranean" : "unclear"),
      studyLocation,
      country,
      buildingType: includesAny(text, ["residential"]) ? "residential" : includesAny(text, ["office", "commercial"]) ? "commercial" : "unclear",
      keyFinding: codebook ? "coded using generated codebook" : "coded using deterministic fallback rules",
      evidenceStrength,
    }),
    confidence,
    needsManualReview: missingAbstract || confidence < 0.6,
  };
};

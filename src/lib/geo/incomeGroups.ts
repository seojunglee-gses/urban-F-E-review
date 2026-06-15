import OpenAI from "openai";

import incomeGroupRows from "../../data/worldBankIncomeGroups.json";
import type { IncomeGroup } from "../../types/review";

export type IncomeGroupMatchMethod = "exact" | "normalized" | "alias" | "llm_fallback" | "unknown";

export type IncomeGroupLookupResult = {
  incomeGroup: IncomeGroup;
  matchedCountry?: string;
  matchMethod: IncomeGroupMatchMethod;
};

type IncomeGroupRow = {
  country: string;
  incomeGroup: IncomeGroup;
};

const VALID_INCOME_GROUPS: IncomeGroup[] = ["Low income", "Lower middle income", "Upper middle income", "High income", "Unknown"];
const DISPLAY_INCOME_GROUPS: IncomeGroup[] = ["High income", "Upper middle income", "Lower middle income", "Low income", "Unknown"];

type RawIncomeGroupRow = {
  country: string;
  "Income group": string | null;
};

const typedRows: IncomeGroupRow[] = (incomeGroupRows as RawIncomeGroupRow[]).flatMap((row) => {
  const incomeGroup = row["Income group"];

  return incomeGroup &&
    VALID_INCOME_GROUPS.includes(incomeGroup as IncomeGroup) &&
    incomeGroup !== "Unknown"
    ? [{ country: row.country, incomeGroup: incomeGroup as IncomeGroup }]
    : [];
});

const normalizeCountry = (country: string): string =>
  country
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|republic|state|states|province|city|urban|area|areas)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States",
  us: "United States",
  "u s": "United States",
  america: "United States",
  uk: "United Kingdom",
  britain: "United Kingdom",
  england: "United Kingdom",
  "south korea": "Korea, Rep.",
  korea: "Korea, Rep.",
  "north korea": "Korea, Dem. People's Rep.",
  russia: "Russian Federation",
  vietnam: "Viet Nam",
  iran: "Iran, Islamic Rep.",
  egypt: "Egypt, Arab Rep.",
  "hong kong": "Hong Kong SAR, China",
};

const rowsByExact = new Map(typedRows.map((row) => [row.country, row]));
const rowsByNormalized = new Map(typedRows.map((row) => [normalizeCountry(row.country), row]));

const getRowByCanonicalCountry = (country: string): IncomeGroupRow | undefined => rowsByExact.get(country);

export const resolveCountryToCanonicalName = (country?: string): string | undefined => {
  const value = country?.trim();
  if (!value) return undefined;
  const exact = rowsByExact.get(value);
  if (exact) return exact.country;
  const normalized = normalizeCountry(value);
  const normalizedRow = rowsByNormalized.get(normalized);
  if (normalizedRow) return normalizedRow.country;
  const alias = COUNTRY_ALIASES[normalized];
  return alias && rowsByExact.has(alias) ? alias : undefined;
};

export const lookupIncomeGroupForCountry = (country?: string): IncomeGroupLookupResult => {
  const value = country?.trim();
  if (!value) return { incomeGroup: "Unknown", matchMethod: "unknown" };
  const exact = rowsByExact.get(value);
  if (exact) return { incomeGroup: exact.incomeGroup, matchedCountry: exact.country, matchMethod: "exact" };
  const normalized = normalizeCountry(value);
  const normalizedRow = rowsByNormalized.get(normalized);
  if (normalizedRow) return { incomeGroup: normalizedRow.incomeGroup, matchedCountry: normalizedRow.country, matchMethod: "normalized" };
  const alias = COUNTRY_ALIASES[normalized];
  const aliasRow = alias ? rowsByExact.get(alias) : undefined;
  if (aliasRow) return { incomeGroup: aliasRow.incomeGroup, matchedCountry: aliasRow.country, matchMethod: "alias" };
  return { incomeGroup: "Unknown", matchMethod: "unknown" };
};

const tokenSet = (value: string): Set<string> => new Set(normalizeCountry(value).split(" ").filter(Boolean));

const similarity = (left: string, right: string): number => {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  const overlap = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  return overlap / new Set([...leftTokens, ...rightTokens]).size;
};


export const getIncomeGroupForCountry = (country?: string): IncomeGroup =>
  lookupIncomeGroupForCountry(country).incomeGroup;

export const getIncomeGroupCandidateCountries = (country?: string, limit = 8): string[] => {
  const value = country?.trim();
  if (!value) return [];
  return typedRows
    .map((row) => ({ country: row.country, score: similarity(value, row.country) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.country.localeCompare(b.country))
    .slice(0, limit)
    .map((candidate) => candidate.country);
};

const extractJsonObject = (content: string): unknown => {
  const trimmed = content.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
  throw new Error("Country resolution response did not contain JSON.");
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

export const resolveCountryToCanonicalNameWithLlmFallback = async (country?: string): Promise<string | undefined> => {
  const deterministic = resolveCountryToCanonicalName(country);
  if (deterministic) return deterministic;
  const candidates = getIncomeGroupCandidateCountries(country);
  if (!country?.trim() || candidates.length === 0 || !process.env.OPENAI_API_KEY) return undefined;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await openai.chat.completions.create({
    model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Resolve an extracted study-area country string to exactly one candidate country name, or null. Return JSON {country: string|null, confidence: number}. Do not return or infer income group.",
      },
      { role: "user", content: JSON.stringify({ extractedCountry: country, candidates }) },
    ],
  });

  const parsed = asRecord(extractJsonObject(completion.choices[0]?.message.content ?? ""));
  const selected = typeof parsed.country === "string" ? parsed.country : undefined;
  const confidence = Number(parsed.confidence ?? 0);
  return selected && candidates.includes(selected) && confidence >= 0.7 ? selected : undefined;
};

export const getIncomeGroupForCountryWithLlmFallback = async (country?: string): Promise<IncomeGroupLookupResult> => {
  const deterministic = lookupIncomeGroupForCountry(country);
  if (deterministic.matchMethod !== "unknown") return deterministic;
  try {
    const canonical = await resolveCountryToCanonicalNameWithLlmFallback(country);
    if (!canonical) return deterministic;
    const row = getRowByCanonicalCountry(canonical);
    return row ? { incomeGroup: row.incomeGroup, matchedCountry: row.country, matchMethod: "llm_fallback" } : deterministic;
  } catch {
    return deterministic;
  }
};

export const incomeGroupDisplayOrder = (): IncomeGroup[] => DISPLAY_INCOME_GROUPS;

export const incomeGroupCountryNames = (): string[] => typedRows.map((row) => row.country);

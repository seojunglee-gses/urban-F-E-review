import { reconstructAbstract } from "./abstract";
import type { OpenAlexWork, Paper } from "../types/review";

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const unique = (values: string[]): string[] => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const getJournal = (work: OpenAlexWork): string | null => {
  const primaryLocation = asRecord(work.primary_location);
  const source = asRecord(primaryLocation.source);
  const displayName = asString(source.display_name);
  return displayName || null;
};

const getUrl = (work: OpenAlexWork): string | null => {
  const primaryLocation = asRecord(work.primary_location);
  return asString(primaryLocation.landing_page_url) || work.landing_page_url || work.id || null;
};

const getAuthors = (work: OpenAlexWork): string[] =>
  asArray(work.authorships)
    .map((authorship) => asString(asRecord(asRecord(authorship).author).display_name))
    .filter(Boolean);

const getInstitutions = (work: OpenAlexWork): string[] =>
  unique(
    asArray(work.authorships).flatMap((authorship) =>
      asArray(asRecord(authorship).institutions).map((institution) => asString(asRecord(institution).display_name)),
    ),
  );

const getCountries = (work: OpenAlexWork): string[] =>
  unique(
    asArray(work.authorships).flatMap((authorship) =>
      asArray(asRecord(authorship).countries).map((country) => asString(country)),
    ),
  );

const getConcepts = (work: OpenAlexWork): string[] =>
  asArray(work.concepts)
    .slice(0, 12)
    .map((concept) => asString(asRecord(concept).display_name))
    .filter(Boolean);

export const normalizeOpenAlexWork = (work: OpenAlexWork): Paper => ({
  id: work.id ?? `openalex-${Math.random().toString(36).slice(2)}`,
  openAlexId: work.id ?? "",
  title: work.title ?? work.display_name ?? "Untitled paper",
  year: work.publication_year ?? null,
  doi: work.doi ?? null,
  journal: getJournal(work),
  authors: getAuthors(work),
  countries: getCountries(work),
  institutions: getInstitutions(work),
  concepts: getConcepts(work),
  abstract: reconstructAbstract(work.abstract_inverted_index),
  url: getUrl(work),
  citedByCount: work.cited_by_count,
  source: "openalex",
});

export const searchOpenAlexWorks = async ({
  query,
  maxResults,
}: {
  query: string;
  maxResults: number;
}): Promise<Paper[]> => {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("per-page", String(Math.min(Math.max(maxResults, 1), 200)));
  url.searchParams.set("filter", "has_abstract:true");
  const mailto = process.env.OPENALEX_MAILTO;
  if (mailto) url.searchParams.set("mailto", mailto);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`OpenAlex request failed with status ${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  return asArray(asRecord(payload).results).map((work) => normalizeOpenAlexWork(work as OpenAlexWork));
};

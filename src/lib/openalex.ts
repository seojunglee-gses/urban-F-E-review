import { reconstructAbstract } from "./abstract";
import { extractStudyAreaMention } from "./geo/extractStudyArea";
import { getIncomeGroupForCountryWithLlmFallback } from "./geo/incomeGroups";
import type { CountValue, OpenAlexWork, Paper } from "../types/review";

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

const getPrimaryTopic = (work: OpenAlexWork): string | null => {
  const topic = asRecord(work.primary_topic);
  return asString(topic.display_name) || asString(topic.name) || null;
};

const getTopicGroups = (payload: unknown): CountValue[] =>
  asArray(asRecord(payload).group_by)
    .map((item) => {
      const record = asRecord(item);
      const name = asString(record.key_display_name) || asString(record.key);
      const count = Number(record.count ?? 0);
      return { name, count: Number.isFinite(count) ? count : 0 };
    })
    .filter((item) => item.name && item.count > 0);

export const normalizeOpenAlexWork = (work: OpenAlexWork): Paper => {
  const title = work.title ?? work.display_name ?? "Untitled paper";
  const abstract = reconstructAbstract(work.abstract_inverted_index);
  return {
    id: work.id ?? `openalex-${Math.random().toString(36).slice(2)}`,
    openAlexId: work.id ?? "",
    title,
    year: work.publication_year ?? null,
    doi: work.doi ?? null,
    journal: getJournal(work),
    authors: getAuthors(work),
    countries: getCountries(work),
    institutions: getInstitutions(work),
    concepts: getConcepts(work),
    abstract,
    url: getUrl(work),
    citedByCount: work.cited_by_count,
    primaryTopic: getPrimaryTopic(work),
    source: "openalex",
    geoMention: extractStudyAreaMention({ title, abstract }),
  };
};

const enrichIncomeGroups = async (papers: Paper[]): Promise<Paper[]> =>
  Promise.all(
    papers.map(async (paper) => {
      const country = paper.geoMention?.country;
      if (!paper.geoMention || !country) return paper;
      const lookup = await getIncomeGroupForCountryWithLlmFallback(country);
      return {
        ...paper,
        geoMention: {
          ...paper.geoMention,
          country: lookup.matchedCountry ?? paper.geoMention.country,
          incomeGroup: lookup.incomeGroup,
        },
      };
    }),
  );

export const searchOpenAlexWorks = async ({
  query,
  maxResults,
}: {
  query: string;
  maxResults: number;
}): Promise<Paper[]> => {
  const limit = Math.min(Math.max(maxResults, 1), 1000);
  const perPage = 200;
  const papers: Paper[] = [];
  let cursor = "*";
  while (papers.length < limit) {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    url.searchParams.set("per-page", String(Math.min(perPage, limit - papers.length)));
    url.searchParams.set("cursor", cursor);
    url.searchParams.set("filter", "has_abstract:true,type:article,from_publication_date:2010-01-01");
    const mailto = process.env.OPENALEX_MAILTO;
    if (mailto) url.searchParams.set("mailto", mailto);

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`OpenAlex request failed with status ${response.status}`);
    }
    const payload = asRecord((await response.json()) as unknown);
    papers.push(...asArray(payload.results).map((work) => normalizeOpenAlexWork(work as OpenAlexWork)));
    const nextCursor = asString(asRecord(payload.meta).next_cursor);
    if (!nextCursor || nextCursor === cursor || asArray(payload.results).length === 0) break;
    cursor = nextCursor;
  }
  return enrichIncomeGroups(papers);
};

export const getOpenAlexTopicGroups = async ({
  query,
}: {
  query: string;
}): Promise<CountValue[]> => {
  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("filter", "has_abstract:true,type:article,from_publication_date:2010-01-01");
  url.searchParams.set("group_by", "primary_topic.id");
  const mailto = process.env.OPENALEX_MAILTO;
  if (mailto) url.searchParams.set("mailto", mailto);

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`OpenAlex topic grouping failed with status ${response.status}`);
  }
  return getTopicGroups((await response.json()) as unknown);
};

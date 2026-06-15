import { reconstructAbstract } from "./abstract";
import { enrichClimateContexts } from "./geo/climateContext";
import { extractStudyAreaCountries, extractStudyAreaMention, splitStudyAreaCities } from "./geo/extractStudyArea";
import { getIncomeGroupForCountryWithLlmFallback } from "./geo/incomeGroups";
import { enrichWorldRegions } from "./geo/worldRegions";
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

const hasUsableAbstract = (paper: Paper): boolean => Boolean(paper.abstract?.trim());

export const OPENALEX_REVIEW_MAX_RESULTS = 1000;
export const OPENALEX_MAX_CURSOR_PAGE_SIZE = 200;

const RETRYABLE_OPENALEX_STATUSES = new Set([429, 500, 502, 503, 504]);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const retryDelayMs = (response: Response, attempt: number): number => {
  const retryAfter = response.headers.get("retry-after");
  const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) return Math.min(retryAfterSeconds * 1000, 8000);
  return Math.min(750 * 2 ** attempt, 6000);
};

const readErrorSnippet = async (response: Response): Promise<string> => {
  try {
    const text = await response.text();
    return text.trim().slice(0, 180);
  } catch {
    return "";
  }
};

const fetchOpenAlexJson = async (url: URL, label: string, maxAttempts = 4): Promise<unknown> => {
  let lastStatus = 0;
  let lastSnippet = "";
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (response.ok) return response.json() as Promise<unknown>;
    lastStatus = response.status;
    const retryable = RETRYABLE_OPENALEX_STATUSES.has(response.status);
    if (!retryable || attempt === maxAttempts - 1) {
      lastSnippet = await readErrorSnippet(response);
      break;
    }
    await sleep(retryDelayMs(response, attempt));
  }
  const detail = lastSnippet ? `: ${lastSnippet}` : ".";
  throw new Error(`${label} failed with status ${lastStatus} after ${maxAttempts} attempts${detail}`);
};

const OPENALEX_PAGE_SIZE_FALLBACKS = [200, 100, 50, 25] as const;

const getPageSizeFallbacks = (requestedPageSize: number): number[] =>
  Array.from(new Set([
    ...OPENALEX_PAGE_SIZE_FALLBACKS.filter((pageSize) => pageSize <= requestedPageSize),
    requestedPageSize,
  ])).sort((a, b) => b - a);

const fetchOpenAlexPageJson = async (url: URL, requestedPageSize: number, label: string): Promise<Record<string, unknown>> => {
  let lastError: unknown;
  for (const pageSize of getPageSizeFallbacks(requestedPageSize)) {
    url.searchParams.set("per-page", String(pageSize));
    try {
      return asRecord(await fetchOpenAlexJson(url, `${label} (per-page ${pageSize})`));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed after trying smaller OpenAlex page sizes.`);
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
  const geoMention = extractStudyAreaMention({ title, abstract });
  const text = `${title}. ${abstract ?? ""}`;
  const studyAreaCountries = extractStudyAreaCountries(text);
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
    studyAreaCountries: studyAreaCountries.length ? studyAreaCountries : geoMention.country ? [geoMention.country] : [],
    studyAreaCities: splitStudyAreaCities(geoMention.city),
    source: "openalex",
    geoMention,
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

const enrichGeoContext = async (papers: Paper[]): Promise<Paper[]> => {
  const incomeEnriched = await enrichIncomeGroups(papers);
  const regions = await enrichWorldRegions(incomeEnriched.flatMap((paper) => paper.studyAreaCountries ?? []));
  const regionEnriched = incomeEnriched.map((paper) => ({
    ...paper,
    studyAreaRegions: Array.from(new Set((paper.studyAreaCountries ?? []).map((country) => regions.get(country) ?? "Unclassified region"))),
  }));
  return enrichClimateContexts(regionEnriched);
};

export const searchOpenAlexWorks = async ({
  query,
  maxResults,
}: {
  query: string;
  maxResults: number;
}): Promise<Paper[]> => {
  const limit = Math.min(Math.max(maxResults, 1), OPENALEX_REVIEW_MAX_RESULTS);
  // OpenAlex caps one cursor page at 200 records; total review results are capped separately by `limit`.
  const perPage = OPENALEX_MAX_CURSOR_PAGE_SIZE;
  const papers: Paper[] = [];
  let cursor = "*";
  while (papers.length < limit) {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    const requestedPageSize = Math.min(perPage, limit - papers.length);
    url.searchParams.set("per-page", String(requestedPageSize));
    url.searchParams.set("cursor", cursor);
    url.searchParams.set("filter", "has_abstract:true,type:article,from_publication_date:2010-01-01");
    const mailto = process.env.OPENALEX_MAILTO;
    if (mailto) url.searchParams.set("mailto", mailto);

    let payload: Record<string, unknown>;
    try {
      payload = await fetchOpenAlexPageJson(url, requestedPageSize, "OpenAlex works request");
    } catch (error) {
      if (papers.length > 0) break;
      throw error;
    }
    papers.push(...asArray(payload.results).map((work) => normalizeOpenAlexWork(work as OpenAlexWork)).filter(hasUsableAbstract));
    const nextCursor = asString(asRecord(payload.meta).next_cursor);
    if (!nextCursor || nextCursor === cursor || asArray(payload.results).length === 0) break;
    cursor = nextCursor;
  }
  return enrichGeoContext(papers);
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

  return getTopicGroups(await fetchOpenAlexJson(url, "OpenAlex topic grouping"));
};

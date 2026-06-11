import type {
  BibliographicRecord,
  NormalizedAbstractRecord,
  WosRawRecord,
} from "../../types/literature";

const countryHints = [
  "China",
  "United States",
  "USA",
  "United Kingdom",
  "UK",
  "Canada",
  "Germany",
  "France",
  "Italy",
  "Spain",
  "Australia",
  "Japan",
  "South Korea",
  "Singapore",
  "India",
  "Brazil",
  "Netherlands",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Portugal",
  "Greece",
  "Turkey",
  "Iran",
  "Chile",
  "Mexico",
  "South Africa",
];

const cityHints = [
  "Beijing",
  "Shanghai",
  "Shenzhen",
  "Hong Kong",
  "London",
  "New York",
  "Chicago",
  "Toronto",
  "Vancouver",
  "Berlin",
  "Paris",
  "Milan",
  "Madrid",
  "Barcelona",
  "Sydney",
  "Melbourne",
  "Tokyo",
  "Seoul",
  "Singapore",
  "Delhi",
  "Mumbai",
  "São Paulo",
  "Amsterdam",
  "Stockholm",
];

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] =>
  Array.isArray(value)
    ? value
    : value === undefined || value === null
      ? []
      : [value];

const asString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
};

const firstString = (...values: unknown[]): string => {
  for (const value of values) {
    const text = asString(value).trim();
    if (text) return text;
  }
  return "";
};

const toStringArray = (value: unknown): string[] =>
  asArray(value)
    .flatMap((item) => {
      if (typeof item === "string") return item.split(/[;|]/);
      const record = asRecord(item);
      return [
        asString(record.full_name),
        asString(record.display_name),
        asString(record.name),
        asString(record.content),
        asString(record["$text"]),
      ];
    })
    .map((item) => item.trim())
    .filter(Boolean);

const unique = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const findNestedStrings = (value: unknown, keyHints: string[]): string[] => {
  const matches: string[] = [];
  const visit = (node: unknown, keyName = ""): void => {
    if (typeof node === "string" || typeof node === "number") {
      const lowerKey = keyName.toLowerCase();
      if (keyHints.some((hint) => lowerKey.includes(hint))) {
        matches.push(String(node));
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, keyName));
      return;
    }
    const record = asRecord(node);
    Object.entries(record).forEach(([key, child]) => visit(child, key));
  };
  visit(value);
  return unique(matches);
};

const extractTitle = (raw: WosRawRecord): string => {
  const staticData = asRecord(raw.static_data);
  const summary = asRecord(staticData.summary);
  const titles = asArray(asRecord(summary.titles).title);
  const titleRecord = titles
    .map(asRecord)
    .find(
      (item) =>
        asString(item.type).includes("item") ||
        asString(item.type).includes("source"),
    );
  return firstString(
    titleRecord?.content,
    titleRecord?.["$text"],
    raw.title,
    raw.TI,
    "Untitled record",
  );
};

const extractJournal = (raw: WosRawRecord): string => {
  const staticData = asRecord(raw.static_data);
  const summary = asRecord(staticData.summary);
  const titles = asArray(asRecord(summary.titles).title);
  const sourceTitle = titles
    .map(asRecord)
    .find((item) => asString(item.type).toLowerCase().includes("source"));
  return firstString(
    sourceTitle?.content,
    sourceTitle?.["$text"],
    raw.SO,
    raw.journal,
  );
};

const extractAbstract = (raw: WosRawRecord): string => {
  const staticData = asRecord(raw.static_data);
  const fullRecordMetadata = asRecord(staticData.fullrecord_metadata);
  const abstracts = asRecord(fullRecordMetadata.abstracts);
  const abstractTexts = findNestedStrings(abstracts, [
    "p",
    "abstract",
    "text",
    "content",
  ]);
  return firstString(abstractTexts.join(" "), raw.AB, raw.abstract);
};

const extractAuthors = (raw: WosRawRecord): string[] => {
  const names = findNestedStrings(raw, ["full_name", "display_name", "author"]);
  const fallback = toStringArray(raw.authors ?? raw.AU);
  return unique([...names, ...fallback]).slice(0, 30);
};

const extractYear = (raw: WosRawRecord): number | null => {
  const candidates = findNestedStrings(raw, ["pubyear", "year", "published"]);
  for (const candidate of candidates) {
    const year = Number.parseInt(candidate, 10);
    if (Number.isFinite(year) && year > 1800) return year;
  }
  return null;
};

const extractDoi = (raw: WosRawRecord): string => {
  const identifiers = findNestedStrings(raw, ["doi"]);
  return firstString(raw.DI, raw.doi, identifiers[0]);
};

const extractKeywords = (raw: WosRawRecord, plus = false): string[] => {
  const key = plus ? "keywords_plus" : "keyword";
  const nested = findNestedStrings(raw, [
    key,
    plus ? "keywordsplus" : "author_keywords",
  ]);
  const fallback = toStringArray(plus ? raw.ID : raw.DE);
  return unique([...nested, ...fallback]).slice(0, 40);
};

const extractCountries = (raw: WosRawRecord): string[] => {
  const affiliationStrings = findNestedStrings(raw, [
    "address",
    "affiliation",
    "country",
  ]);
  const text = JSON.stringify(raw);
  const countries = countryHints.filter((country) =>
    text.toLowerCase().includes(country.toLowerCase()),
  );
  return unique([
    ...countries,
    ...affiliationStrings.filter((item) => countryHints.includes(item)),
  ]);
};

export const normalizeWosRecord = (
  raw: WosRawRecord,
  index: number,
): BibliographicRecord => {
  const uid = firstString(raw.uid, raw.UT, `WOS:LOCAL-${index + 1}`);
  const countries = extractCountries(raw);
  return {
    id: uid.replace(/[^a-zA-Z0-9-]/g, "-"),
    uid,
    title: extractTitle(raw),
    authors: extractAuthors(raw),
    year: extractYear(raw),
    journal: extractJournal(raw),
    doi: extractDoi(raw),
    abstract: extractAbstract(raw),
    authorKeywords: extractKeywords(raw),
    keywordsPlus: extractKeywords(raw, true),
    sourceDatabase: "Web of Science",
    documentType: firstString(raw.DT, raw.documentType, "Article/Review"),
    timesCited: Number.isFinite(Number(raw.TC)) ? Number(raw.TC) : null,
    affiliations: findNestedStrings(raw, ["address", "affiliation"]).slice(
      0,
      20,
    ),
    countries,
    raw,
  };
};

export const normalizeBibliographicRecords = (
  records: BibliographicRecord[],
): NormalizedAbstractRecord[] =>
  records.map((record) => {
    const keywords = unique([...record.authorKeywords, ...record.keywordsPlus]);
    const normalizedText =
      `${record.title}\n${record.abstract}\n${keywords.join(" ")}`
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
    const locations = unique([
      ...record.countries,
      ...cityHints.filter((city) =>
        normalizedText.includes(city.toLowerCase()),
      ),
    ]);
    const hasUrbanEnergySignal =
      /urban|city|cities|neighborhood|morpholog|density|heat island|lcz|canyon/.test(
        normalizedText,
      ) &&
      /energy|electricity|cooling|heating|demand|emissions|consumption/.test(
        normalizedText,
      );
    return {
      id: record.id,
      title: record.title,
      abstract: record.abstract,
      year: record.year,
      doi: record.doi,
      authors: record.authors,
      journal: record.journal,
      keywords,
      candidateLocations: locations,
      normalizedText,
      screeningStatus:
        record.abstract.length < 80
          ? "uncertain"
          : hasUrbanEnergySignal
            ? "included"
            : "uncertain",
      exclusionReason:
        record.abstract.length < 80
          ? "Abstract missing or too short for MVP screening."
          : undefined,
    };
  });

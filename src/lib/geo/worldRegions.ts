import OpenAI from "openai";

export const WORLD_REGION_GROUPS = [
  "East Asia & Pacific",
  "Europe & Central Asia",
  "Latin America & the Caribbean",
  "Middle East & North Africa",
  "South Asia",
  "Sub-Saharan Africa",
] as const;

export type WorldRegionGroup = (typeof WORLD_REGION_GROUPS)[number];

export const COUNTRY_REGION_FALLBACKS: Record<string, WorldRegionGroup> = {
  Australia: "East Asia & Pacific",
  Brazil: "Latin America & the Caribbean",
  Canada: "Europe & Central Asia",
  China: "East Asia & Pacific",
  France: "Europe & Central Asia",
  Germany: "Europe & Central Asia",
  India: "South Asia",
  Indonesia: "East Asia & Pacific",
  Italy: "Europe & Central Asia",
  Japan: "East Asia & Pacific",
  "Korea, Rep.": "East Asia & Pacific",
  Malaysia: "East Asia & Pacific",
  Mexico: "Latin America & the Caribbean",
  Netherlands: "Europe & Central Asia",
  Singapore: "East Asia & Pacific",
  "South Africa": "Sub-Saharan Africa",
  Spain: "Europe & Central Asia",
  Sweden: "Europe & Central Asia",
  Thailand: "East Asia & Pacific",
  Türkiye: "Europe & Central Asia",
  "United Arab Emirates": "Middle East & North Africa",
  "United Kingdom": "Europe & Central Asia",
  "United States": "Europe & Central Asia",
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const parseJsonObject = (content: string): unknown => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(content.slice(start, end + 1)) as unknown;
  throw new Error("Region lookup response did not contain JSON.");
};

export const enrichWorldRegions = async (countries: string[]): Promise<Map<string, WorldRegionGroup>> => {
  const uniqueCountries = Array.from(new Set(countries.filter(Boolean)));
  const resolved = new Map<string, WorldRegionGroup>();
  uniqueCountries.forEach((country) => {
    const fallback = COUNTRY_REGION_FALLBACKS[country];
    if (fallback) resolved.set(country, fallback);
  });
  const unresolved = uniqueCountries.filter((country) => !resolved.has(country)).slice(0, 100);
  if (!unresolved.length || !process.env.OPENAI_API_KEY) return resolved;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Classify each country into exactly one allowed World Bank-style region. Return JSON {"items":[{"country":"...","region":"East Asia & Pacific|Europe & Central Asia|Latin America & the Caribbean|Middle East & North Africa|South Asia|Sub-Saharan Africa"}]}. No explanations.',
        },
        { role: "user", content: JSON.stringify({ countries: unresolved }) },
      ],
    });
    asArray(asRecord(parseJsonObject(completion.choices[0]?.message.content ?? "")).items).forEach((item) => {
      const record = asRecord(item);
      const country = typeof record.country === "string" ? record.country : "";
      const region = typeof record.region === "string" ? record.region : "";
      if (country && WORLD_REGION_GROUPS.includes(region as WorldRegionGroup)) resolved.set(country, region as WorldRegionGroup);
    });
  } catch {
    // Keep deterministic regions; truly unresolved countries are counted as "Unclassified region".
  }
  return resolved;
};

export const regionForCountry = (country?: string): WorldRegionGroup | undefined => country ? COUNTRY_REGION_FALLBACKS[country] : undefined;

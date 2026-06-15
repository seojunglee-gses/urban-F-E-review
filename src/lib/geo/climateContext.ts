import OpenAI from "openai";

import type { GeoMention, Paper } from "../../types/review";

const CLIMATE_VALUES = ["hot-arid", "tropical", "temperate", "cold", "Mediterranean"] as const;
type ClimateValue = (typeof CLIMATE_VALUES)[number];

const COUNTRY_CLIMATE_FALLBACKS: Record<string, ClimateValue> = {
  Australia: "hot-arid",
  Brazil: "tropical",
  Canada: "cold",
  China: "temperate",
  Egypt: "hot-arid",
  France: "temperate",
  Germany: "temperate",
  Greece: "Mediterranean",
  India: "tropical",
  Indonesia: "tropical",
  Italy: "Mediterranean",
  Japan: "temperate",
  "Korea, Rep.": "temperate",
  Malaysia: "tropical",
  Mexico: "temperate",
  Netherlands: "temperate",
  Singapore: "tropical",
  Spain: "Mediterranean",
  Sweden: "cold",
  Thailand: "tropical",
  Türkiye: "Mediterranean",
  "United Arab Emirates": "hot-arid",
  "United Kingdom": "temperate",
  "United States": "temperate",
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const parseJsonObject = (content: string): unknown => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(content.slice(start, end + 1)) as unknown;
  throw new Error("Climate lookup response did not contain JSON.");
};

const deterministicClimate = (mention: GeoMention): string | undefined => {
  if (mention.climateZone) return mention.climateZone;
  if (mention.country && COUNTRY_CLIMATE_FALLBACKS[mention.country]) return COUNTRY_CLIMATE_FALLBACKS[mention.country];
  return undefined;
};

const locationKey = (mention: GeoMention): string | undefined => {
  const key = [mention.city, mention.country].filter(Boolean).join(", ");
  return key || mention.country || mention.region;
};

export const enrichClimateContexts = async (papers: Paper[]): Promise<Paper[]> => {
  const mentions = papers.map((paper) => paper.geoMention).filter((mention): mention is GeoMention => Boolean(mention));
  const deterministic = new Map<string, string>();
  mentions.forEach((mention) => {
    const key = locationKey(mention);
    const climate = deterministicClimate(mention);
    if (key && climate) deterministic.set(key, climate);
  });

  const unresolved = Array.from(new Set(mentions.map(locationKey).filter((key): key is string => Boolean(key)))).filter((key) => !deterministic.has(key)).slice(0, 80);
  const llmResolved = new Map<string, string>();
  if (unresolved.length && process.env.OPENAI_API_KEY) {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: process.env.LLM_MODEL ?? "gpt-4.1-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Classify each city/country into one broad climate context. Return JSON {"items":[{"location":"...","climateZone":"hot-arid|tropical|temperate|cold|Mediterranean"}]}. Use the best-known dominant city climate when city is present; otherwise use dominant country climate. No explanations.',
          },
          { role: "user", content: JSON.stringify({ locations: unresolved }) },
        ],
      });
      asArray(asRecord(parseJsonObject(completion.choices[0]?.message.content ?? "")).items).forEach((item) => {
        const record = asRecord(item);
        const location = typeof record.location === "string" ? record.location : "";
        const climateZone = typeof record.climateZone === "string" ? record.climateZone : "";
        if (location && CLIMATE_VALUES.includes(climateZone as ClimateValue)) llmResolved.set(location, climateZone);
      });
    } catch {
      // Keep deterministic fallbacks; climate remains unset only when no city/country lookup is possible.
    }
  }

  return papers.map((paper) => {
    const mention = paper.geoMention;
    if (!mention) return paper;
    const key = locationKey(mention);
    const climateZone = mention.climateZone ?? (key ? deterministic.get(key) ?? llmResolved.get(key) : undefined);
    return climateZone ? { ...paper, geoMention: { ...mention, climateZone } } : paper;
  });
};

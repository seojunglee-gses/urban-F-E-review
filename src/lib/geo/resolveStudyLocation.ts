import locationReference from "../../data/locationReference.json";
import locationUnresolvedTerms from "../../data/locationUnresolvedTerms.json";

export type StudyLocationMatchLevel = "city" | "country" | "region" | "admin" | "unresolved";

export type ResolvedStudyLocation = {
  city: string | null;
  country: string | null;
  region: string | null;
  worldBankRegion: string | null;
  incomeGroup: string | null;
  latitude: number | null;
  longitude: number | null;
  climateContext: string | null;
  climateScheme: string | null;
  koppenCode: string | null;
  koppenName: string | null;
  hwClimateZone: string | null;
  matchLevel: StudyLocationMatchLevel;
  confidence: number;
};

type LocationReference = ResolvedStudyLocation & {
  aliases: string[];
  studyLocationRaw: string;
};

const SPECIFICITY: Record<StudyLocationMatchLevel, number> = {
  unresolved: 0,
  region: 1,
  country: 2,
  admin: 3,
  city: 4,
};

const unresolved: ResolvedStudyLocation = {
  city: null,
  country: null,
  region: null,
  worldBankRegion: null,
  incomeGroup: null,
  latitude: null,
  longitude: null,
  climateContext: null,
  climateScheme: null,
  koppenCode: null,
  koppenName: null,
  hwClimateZone: null,
  matchLevel: "unresolved",
  confidence: 0,
};

const normalize = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\bU\.S\.\b/gi, "US")
    .replace(/[;,/|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const references = locationReference as LocationReference[];
const unresolvedTerms = new Set((locationUnresolvedTerms as string[]).map(normalize));

const aliasEntries = references.flatMap((reference) =>
  reference.aliases.map((alias) => ({
    alias,
    normalizedAlias: normalize(alias),
    reference,
  })),
);

const toResolved = (reference: LocationReference): ResolvedStudyLocation => ({
  city: reference.city,
  country: reference.country,
  region: reference.region,
  worldBankRegion: reference.worldBankRegion,
  incomeGroup: reference.incomeGroup,
  latitude: reference.latitude,
  longitude: reference.longitude,
  climateContext: reference.climateContext,
  climateScheme: reference.climateScheme,
  koppenCode: reference.koppenCode,
  koppenName: reference.koppenName,
  hwClimateZone: reference.hwClimateZone,
  matchLevel: reference.matchLevel,
  confidence: reference.confidence,
});

export function resolveStudyLocation(input: string | null | undefined): ResolvedStudyLocation {
  const normalizedInput = normalize(input ?? "");
  if (!normalizedInput || unresolvedTerms.has(normalizedInput)) return unresolved;

  const matches = aliasEntries.filter(({ normalizedAlias }) => normalizedInput === normalizedAlias || normalizedInput.includes(normalizedAlias));
  if (!matches.length) return unresolved;

  const best = matches.sort((a, b) =>
    b.normalizedAlias.length - a.normalizedAlias.length ||
    SPECIFICITY[b.reference.matchLevel] - SPECIFICITY[a.reference.matchLevel] ||
    b.reference.confidence - a.reference.confidence,
  )[0];

  return toResolved(best.reference);
}

export function enrichCodesWithResolvedLocation<T extends { studyLocation?: string | null }>(codes: T): T & { resolvedLocation: ResolvedStudyLocation } {
  return { ...codes, resolvedLocation: resolveStudyLocation(codes.studyLocation) };
}

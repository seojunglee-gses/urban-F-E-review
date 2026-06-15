import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const reference = JSON.parse(readFileSync(join(__dirname, '../src/data/locationReference.json'), 'utf8'));
const unresolvedTerms = JSON.parse(readFileSync(join(__dirname, '../src/data/locationUnresolvedTerms.json'), 'utf8'));

const specificity = { unresolved: 0, region: 1, country: 2, admin: 3, city: 4 };
const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’‘]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/\bU\.S\.\b/gi, 'US')
  .replace(/[;,/|]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase();

const unresolved = { city: null, country: null, region: null, worldBankRegion: null, incomeGroup: null, latitude: null, longitude: null, climateContext: null, climateScheme: null, koppenCode: null, koppenName: null, hwClimateZone: null, matchLevel: 'unresolved', confidence: 0 };
const unresolvedSet = new Set(unresolvedTerms.map(normalize));
const aliasEntries = reference.flatMap((item) => item.aliases.map((alias) => ({ alias, normalizedAlias: normalize(alias), item })));
const toResolved = (item) => ({ city: item.city, country: item.country, region: item.region, worldBankRegion: item.worldBankRegion, incomeGroup: item.incomeGroup, latitude: item.latitude, longitude: item.longitude, climateContext: item.climateContext, climateScheme: item.climateScheme, koppenCode: item.koppenCode, koppenName: item.koppenName, hwClimateZone: item.hwClimateZone, matchLevel: item.matchLevel, confidence: item.confidence });
const resolveStudyLocation = (input) => {
  const normalizedInput = normalize(input);
  if (!normalizedInput || unresolvedSet.has(normalizedInput)) return unresolved;
  const matches = aliasEntries.filter(({ normalizedAlias }) => normalizedInput === normalizedAlias || normalizedInput.includes(normalizedAlias));
  if (!matches.length) return unresolved;
  matches.sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length || specificity[b.item.matchLevel] - specificity[a.item.matchLevel] || b.item.confidence - a.item.confidence);
  return toResolved(matches[0].item);
};

const tests = [
  ['London', { city: 'London', country: 'United Kingdom', region: 'Europe', koppenCode: 'Cfb', hasCoordinates: true }],
  ['Beijing', { city: 'Beijing', country: 'China', region: 'Asia', koppenCode: 'Dwa', hasCoordinates: true }],
  ['Shanghai; China', { city: 'Shanghai', country: 'China', region: 'Asia', koppenCode: 'Cfa', hasCoordinates: true }],
  ['China', { city: null, country: 'China', region: 'Asia', climateContext: 'multi-zone; unresolved without city/subnational location', latitude: null, longitude: null }],
  ['Europe', { city: null, country: null, region: 'Europe', latitude: null, longitude: null }],
  ['United States', { city: null, country: 'United States', region: 'North America', latitude: null, longitude: null }],
  ['Phoenix', { city: 'Phoenix', country: 'United States', region: 'North America', koppenCode: 'BWh', hasCoordinates: true }],
  ['Smart', { matchLevel: 'unresolved' }],
  ['Urban Context', { matchLevel: 'unresolved' }],
];

for (const [input, expected] of tests) {
  const actual = resolveStudyLocation(input);
  for (const [key, value] of Object.entries(expected)) {
    if (key === 'hasCoordinates') {
      const hasCoordinates = typeof actual.latitude === 'number' && typeof actual.longitude === 'number';
      if (hasCoordinates !== value) throw new Error(`${input}: expected coordinates=${value}, got ${actual.latitude},${actual.longitude}`);
    } else if (actual[key] !== value) {
      throw new Error(`${input}: expected ${key}=${value}, got ${actual[key]}`);
    }
  }
}

console.log(`Validated ${tests.length} location reference cases.`);

import type { WosSearchConfig } from "../../types/literature";

export const defaultWosSearchConfig: WosSearchConfig = {
  keywords: [
    '"urban form" AND energy',
    '"urban heat island" AND energy',
    '"urban meteorology" AND energy',
  ],
  query:
    'TS=(("urban form" AND energy) OR ("urban heat island" AND energy) OR ("urban meteorology" AND energy)) AND LA=(English)',
  yearStart: 2010,
  yearEnd: 2025,
  language: "English",
  sourceTypes: ["Article", "Review"],
  searchFields: ["title", "abstract", "keywords", "topic"],
  count: 50,
  firstRecord: 1,
};

export const MAX_WOS_COUNT = 100;
export const MIN_YEAR = 1990;
export const MAX_YEAR = 2030;

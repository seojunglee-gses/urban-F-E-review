const invalidLocationTerms = /\b(?:compared|similar|scenario|model|study|analysis|energy|building|buildings|urban|climate|smart|hcf|canadian|american|chinese|european|residential|commercial)\b/i;
const unknownLocationTerms = /^(?:unknown|null|n\/a|na|undefined|unclear|none|-)$/i;

export const isKnownLocationValue = (value?: string | null): value is string => {
  const trimmed = value?.trim();
  return Boolean(trimmed) && !unknownLocationTerms.test(trimmed!);
};

export const isValidStudyAreaCity = (city?: string | null): city is string => {
  const trimmed = city?.trim();
  return Boolean(trimmed) && trimmed!.length <= 45 && /^[A-Z][A-Za-zÀ-ÖØ-öø-ÿ .'-]+$/.test(trimmed!) && !invalidLocationTerms.test(trimmed!);
};

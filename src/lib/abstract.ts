export const reconstructAbstract = (
  invertedIndex: Record<string, number[]> | null | undefined,
): string | null => {
  if (!invertedIndex) return null;
  const positionedWords: Array<{ word: string; index: number }> = [];
  Object.entries(invertedIndex).forEach(([word, positions]) => {
    positions.forEach((index) => positionedWords.push({ word, index }));
  });
  if (positionedWords.length === 0) return null;
  return positionedWords
    .sort((a, b) => a.index - b.index)
    .map(({ word }) => word)
    .join(" ");
};

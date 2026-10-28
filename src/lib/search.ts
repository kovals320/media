// Search ignores niqqud, punctuation, Hebrew final letters (ם/מ, ן/נ, ...) and double ו/י spellings.
const FINALS: Record<string, string> = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };

export function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, "")
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/['"`׳״]/g, "") // באנג'י = באנגי
    .replace(/וו/g, "ו") // מצווה = מצוה
    .replace(/יי/g, "י") // ריקוד / רייקוד style spelling variants
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Indexes of the items whose text contains every word of the query (all items when the query is empty). */
export function matches(index: string[], query: string): number[] {
  const words = normalize(query).split(" ").filter(Boolean);
  return index.flatMap((text, i) => (words.every((w) => text.includes(w)) ? [i] : []));
}

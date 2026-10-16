// Finds a year (1950–2099) written in a title, e.g. "2026 אליפות" -> 2026.
export function yearInTitle(title: string): number | null {
  const match = title.match(/(?<!\d)(19[5-9]\d|20\d\d)(?!\d)/);
  return match ? Number(match[1]) : null;
}

/**
 * Sort by the year written in the title, newest first.
 * Items without a year come first, keeping their original order,
 * so they're easy to spot and fix. Ties fall back to `date` (newest first),
 * then to the original order.
 */
export function sortByTitleYear<T>(
  items: T[],
  getTitle: (item: T) => string,
  getDate?: (item: T) => string | null | undefined,
): T[] {
  return items
    .map((item, index) => ({ item, index, year: yearInTitle(getTitle(item)) }))
    .sort((a, b) => {
      if (a.year === null || b.year === null) {
        if (a.year === null && b.year === null) return a.index - b.index;
        return a.year === null ? -1 : 1;
      }
      if (a.year !== b.year) return b.year - a.year;
      const da = getDate?.(a.item) ?? "";
      const db = getDate?.(b.item) ?? "";
      if (da !== db) return db.localeCompare(da);
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

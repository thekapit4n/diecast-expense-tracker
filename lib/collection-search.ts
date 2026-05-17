export interface CollectionSearchable {
  name: string
  item_no?: string | null
}

/**
 * Filters collections where the name or item number contains any of the
 * whitespace-separated search terms (case-insensitive). Results with more
 * matching terms are ranked higher.
 */
export function filterCollectionsBySearch<T extends CollectionSearchable>(
  collections: T[],
  query: string,
  options?: { minQueryLength?: number; limit?: number }
): T[] {
  const minQueryLength = options?.minQueryLength ?? 2
  const limit = options?.limit ?? 50

  const terms = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0)

  if (terms.length === 0 || query.trim().length < minQueryLength) {
    return []
  }

  return collections
    .map((collection) => {
      const haystack = `${collection.name} ${collection.item_no ?? ""}`.toLowerCase()
      const matchCount = terms.filter((term) => haystack.includes(term)).length
      return { collection, matchCount }
    })
    .filter((entry) => entry.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount || a.collection.name.localeCompare(b.collection.name))
    .slice(0, limit)
    .map((entry) => entry.collection)
}

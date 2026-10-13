export type SearchReveal = { query: string; requestId: number }
export type ResourceSearchReveal = SearchReveal & { resourceId: string; nodeId: string }

export function searchRevealKey(match: SearchReveal | undefined): string | undefined {
  return match ? JSON.stringify([match.requestId, match.query]) : undefined
}

export function buildSearchMatchPattern(query: string): string {
  return [...new Set(query.trim().split(/\s+/u).filter(Boolean))]
    .sort((left, right) => right.length - left.length)
    .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
}

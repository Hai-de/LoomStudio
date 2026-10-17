import { safeLocalStorage } from '../../../shared/browser/safe-local-storage.js'

export type RecentCharacter = { cardId: string; timelineId?: string; branchId?: string }
const key = (endpoint: string) => `loom.studio.recentCharacters:${endpoint}`

export function readRecentCharacters(endpoint: string): RecentCharacter[] {
  const stored = safeLocalStorage.getItem(key(endpoint))
  if (!stored) return []
  try {
    const entries: unknown = JSON.parse(stored)
    if (!Array.isArray(entries)) return []
    return entries.filter((entry): entry is RecentCharacter => Boolean(entry) && typeof entry === 'object'
      && typeof entry.cardId === 'string'
      && (entry.timelineId === undefined || typeof entry.timelineId === 'string')
      && (entry.branchId === undefined || typeof entry.branchId === 'string')).slice(0, 24)
  } catch { return [] }
}

export function visitCharacter(entries: RecentCharacter[], visit: RecentCharacter): RecentCharacter[] {
  const previous = entries.find(entry => entry.cardId === visit.cardId)
  // Opening the character's start screen must not erase its last successful story visit.
  const next = visit.timelineId ? visit : previous ?? visit
  return [next, ...entries.filter(entry => entry.cardId !== visit.cardId)].slice(0, 24)
}

export function saveRecentCharacters(endpoint: string, entries: RecentCharacter[]): void {
  safeLocalStorage.setItem(key(endpoint), JSON.stringify(entries))
}

import { useEffect, useState } from 'react'
import { readRecentCharacters, saveRecentCharacters, visitCharacter } from './recent-characters.js'

export function useRecentCharacters(endpoint: string, cardId?: string, timelineId?: string, branchId?: string) {
  const [snapshot, setSnapshot] = useState(() => ({ endpoint, entries: readRecentCharacters(endpoint) }))
  useEffect(() => {
    const entries = readRecentCharacters(endpoint)
    const next = cardId ? visitCharacter(entries, { cardId, timelineId, branchId }) : entries
    if (cardId) saveRecentCharacters(endpoint, next)
    setSnapshot({ endpoint, entries: next })
  }, [endpoint, cardId, timelineId, branchId])
  return snapshot.endpoint === endpoint ? snapshot.entries : []
}

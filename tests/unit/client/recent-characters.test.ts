import { afterEach, describe, expect, it, vi } from 'vitest'
import { readRecentCharacters, saveRecentCharacters, visitCharacter } from '../../../apps/studio-client/src/features/recent-characters/model/recent-characters.js'

afterEach(() => vi.unstubAllGlobals())

describe('recent character visits', () => {
  it('moves the visited character to the front and remembers the exact story and branch', () => {
    const entries = [{ cardId: 'a', timelineId: 'a1', branchId: 'main' }, { cardId: 'b', timelineId: 'b1', branchId: 'main' }]
    const next = visitCharacter(entries, { cardId: 'b', timelineId: 'b2', branchId: 'alternate' })
    expect(next).toEqual([{ cardId: 'b', timelineId: 'b2', branchId: 'alternate' }, entries[0]])
    expect(entries[1].timelineId).toBe('b1')
  })

  it('does not erase the previous story when opening the character start screen', () => {
    const visit = { cardId: 'a', timelineId: 'story', branchId: 'branch' }
    expect(visitCharacter([visit], { cardId: 'a' })).toEqual([visit])
    expect(visitCharacter([], { cardId: 'new' })).toEqual([{ cardId: 'new' }])
  })

  it('isolates endpoints, restores valid visits and ignores malformed storage', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
    const visits = [{ cardId: 'a', timelineId: 'story', branchId: 'branch' }]
    saveRecentCharacters('/one/rpc', visits)
    expect(readRecentCharacters('/one/rpc')).toEqual(visits)
    expect(readRecentCharacters('/two/rpc')).toEqual([])
    localStorage.setItem('loom.studio.recentCharacters:/one/rpc', '{broken')
    expect(readRecentCharacters('/one/rpc')).toEqual([])
  })
})

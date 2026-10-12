import { useEffect, useRef, useState } from 'react'
import type { AgentSession, NarrativeTimeline } from '../../../entities/index.js'
import type { StudioApi } from '../../../shared/api/studio-api.js'

/** Own the endpoint's directory caches and prevent late reads from replacing local writes. */
export function useNarrativeCollections(api: StudioApi) {
  type CollectionSource = {
    api: StudioApi; timelineRead: number; sessionRead: number; timelineWrite: number; sessionWrite: number; disposed?: boolean
  }
  const collectionSourceRef = useRef<CollectionSource>({ api, timelineRead: 0, sessionRead: 0, timelineWrite: 0, sessionWrite: 0 })
  if (collectionSourceRef.current.api !== api) {
    collectionSourceRef.current = { api, timelineRead: 0, sessionRead: 0, timelineWrite: 0, sessionWrite: 0 }
  }
  const collectionSource = collectionSourceRef.current
  const [timelineCollection, setTimelineCollection] = useState<{ source: CollectionSource; items: NarrativeTimeline[] }>()
  const allTimelines = timelineCollection?.source === collectionSource ? timelineCollection.items : []
  const [sessionCollection, setSessionCollection] = useState<{ source: CollectionSource; items: AgentSession[] }>()
  const allAgentSessions = sessionCollection?.source === collectionSource ? sessionCollection.items : []

  useEffect(() => {
    collectionSource.disposed = false
    return () => {
      collectionSource.disposed = true
      collectionSource.timelineRead++
      collectionSource.sessionRead++
    }
  }, [collectionSource])

  async function refreshAllTimelines(): Promise<NarrativeTimeline[]> {
    if (!ownsCollectionSource()) return []
    const request = ++collectionSource.timelineRead
    const revision = collectionSource.timelineWrite
    const timelines: NarrativeTimeline[] = []
    let cursor: string | undefined
    do {
      const page = await api.narratives.list({ cursor, limit: 100 })
      timelines.push(...page.timelines)
      cursor = page.nextCursor
    } while (cursor)
    if (ownsCollectionSource() && request === collectionSource.timelineRead) {
      if (revision !== collectionSource.timelineWrite) return refreshAllTimelines()
      setTimelineCollection({ source: collectionSource, items: timelines })
    }
    return timelines
  }

  function ownsCollectionSource() {
    return collectionSourceRef.current === collectionSource && !collectionSource.disposed
  }

  function setAllTimelines(update: (current: NarrativeTimeline[]) => NarrativeTimeline[]) {
    if (!ownsCollectionSource()) return
    collectionSource.timelineWrite++
    setTimelineCollection(current => ({
      source: collectionSource,
      items: update(current?.source === collectionSource ? current.items : []),
    }))
  }

  function setAllAgentSessions(update: (current: AgentSession[]) => AgentSession[]) {
    if (!ownsCollectionSource()) return
    collectionSource.sessionWrite++
    setSessionCollection(current => ({
      source: collectionSource,
      items: update(current?.source === collectionSource ? current.items : []),
    }))
  }

  async function listAllAgentSessions() {
    const sessions: AgentSession[] = []
    let cursor: string | undefined
    do {
      const page = await api.agentSessions.list({ cursor, limit: 100 })
      sessions.push(...page.sessions)
      cursor = page.nextCursor
    } while (cursor)
    return sessions
  }

  async function refreshAllAgentSessions(): Promise<AgentSession[]> {
    if (!ownsCollectionSource()) return []
    const request = ++collectionSource.sessionRead
    const revision = collectionSource.sessionWrite
    const sessions = await listAllAgentSessions()
    if (ownsCollectionSource() && request === collectionSource.sessionRead) {
      if (revision !== collectionSource.sessionWrite) return refreshAllAgentSessions()
      setSessionCollection({ source: collectionSource, items: sessions })
    }
    return sessions
  }

  return {
    allTimelines, allAgentSessions, setAllTimelines, setAllAgentSessions,
    refreshAllTimelines, refreshAllAgentSessions, ownsCollectionSource,
    sessionWriteRevision: () => collectionSource.sessionWrite,
  }
}

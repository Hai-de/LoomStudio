import type { AgentSession } from '../../../entities/index.js'

type DeleteHistoryItemsOptions = {
  timelineIds: string[]
  sessionIds: string[]
  sessions: AgentSession[]
  onDeleteTimeline?(timelineId: string): Promise<boolean> | void
  onDeleteAgentSession?(sessionId: string): Promise<boolean> | void
}

/** Timeline deletion cascades to its Sessions; only confirmed successes are removed. */
export async function deleteHistoryItems({
  timelineIds, sessionIds: selectedSessionIds, sessions, onDeleteTimeline, onDeleteAgentSession,
}: DeleteHistoryItemsOptions) {
  const cascadedSessions = sessions.filter(session => session.timelineId && timelineIds.includes(session.timelineId))
  const sessionIds = selectedSessionIds.filter(id => !cascadedSessions.some(session => session.id === id))
  const [timelineResults, sessionResults] = await Promise.all([
    Promise.allSettled(timelineIds.map(id => onDeleteTimeline?.(id))),
    Promise.allSettled(sessionIds.map(id => onDeleteAgentSession?.(id))),
  ])
  const deletedTimelineIds = new Set(
    timelineIds.filter((_, index) => timelineResults[index]?.status === 'fulfilled' && timelineResults[index]?.value === true),
  )
  const deletedSessionIds = new Set(
    sessionIds.filter((_, index) => sessionResults[index]?.status === 'fulfilled' && sessionResults[index]?.value === true),
  )
  for (const session of cascadedSessions) {
    if (deletedTimelineIds.has(session.timelineId!)) deletedSessionIds.add(session.id)
  }
  return {
    deletedTimelineIds,
    deletedSessionIds,
    complete: deletedTimelineIds.size === timelineIds.length && sessionIds.every(id => deletedSessionIds.has(id)),
  }
}

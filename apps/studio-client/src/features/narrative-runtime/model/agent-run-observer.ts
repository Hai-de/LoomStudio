import type { AgentSession, AgentTranscriptEntry, InvokeAgentTurnResult } from '../../../entities/index.js'
import type { AgentMutationApproval, StudioApi } from '../../../shared/api/studio-api.js'

export type AgentRunStatus = 'running' | 'suspended' | 'completed' | 'cancelled' | 'failed'
export type ActiveAgentRun = { runId: string; status: AgentRunStatus; approval?: AgentMutationApproval }
export type RunRecovery = {
  target: 'narrative' | 'agent'
  status: 'disconnected' | 'failed' | 'cancelled' | 'refresh-failed'
  error?: string
  refreshFailed?: boolean
  input?: string
}

export type ObservedRun = {
  api: StudioApi
  selection: number
  runId: string
  sessionId: string
  target: RunRecovery['target']
  input?: string
  narrativeTarget?: { timelineId: string; branchId: string }
  optimisticEntryId?: string
  streamingId: string
  cursor: number
  status: AgentRunStatus
  observing: boolean
}

export function inspectSessionRunStatus(entries: AgentTranscriptEntry[]): { runId?: string; status: 'idle' | 'running' | 'suspended' } {
  if (!entries.length) return { status: 'idle' }
  const lastRunState = entries.slice().reverse().find(e => e.entry.kind === 'run-state')
  if (lastRunState && lastRunState.entry.kind === 'run-state') {
    if (lastRunState.entry.state === 'suspended' || lastRunState.entry.state === 'running') {
      return { runId: lastRunState.runId, status: 'suspended' }
    }
    if (lastRunState.entry.state === 'completed' || lastRunState.entry.state === 'failed' || lastRunState.entry.state === 'aborted' || lastRunState.entry.state === 'discarded') {
      return { status: 'idle' }
    }
  }

  const lastUser = entries.slice().reverse().find(e => e.entry.kind === 'message' && e.entry.role === 'user')
  if (lastUser) {
    const userIdx = entries.indexOf(lastUser)
    const laterEntries = entries.slice(userIdx + 1)
    const hasCompletedAssistant = laterEntries.some(
      e => e.entry.kind === 'message' && e.entry.role === 'assistant' && e.entry.state !== 'partial' && typeof e.entry.content === 'string' && Boolean(e.entry.content.trim())
    )
    const hasCompletedRun = laterEntries.some(
      e => e.entry.kind === 'run-state' && e.entry.state === 'completed'
    )
    if (!hasCompletedAssistant || !hasCompletedRun) {
      return { runId: lastUser.runId, status: 'suspended' }
    }
  }

  return { status: 'idle' }
}

export async function loadTranscript(api: StudioApi, agentSessionId: string) {
  const entries: AgentTranscriptEntry[] = []
  let cursor: string | undefined
  let session: AgentSession | undefined
  do {
    const page = await api.agentSessions.getTranscript({ agentSessionId, cursor, limit: 100 })
    session = page.session
    entries.unshift(...page.entries)
    cursor = page.nextCursor
  } while (cursor)
  if (!session) throw new Error(`Agent session not found: ${agentSessionId}`)
  return { entries, session }
}

export async function releasePrimaryRun(api: StudioApi, sessionId: string): Promise<void> {
  const transcript = await loadTranscript(api, sessionId)
  const inspected = inspectSessionRunStatus(transcript.entries)
  if (!inspected.runId) return
  const run = await api.agentSessions.runState(inspected.runId)
  if (run.state === 'running') throw new Error('生成期间不能切换主写作对话')
  if (run.state !== 'suspended') return
  const abandoned = await api.agentSessions.abandonRun(run.runId)
  if (!abandoned.accepted) throw new Error('旧任务放弃失败，主写作对话未切换')
}

export async function runAgentTurn(
  run: ObservedRun,
  isCurrent: () => boolean,
  updateMessages: (update: (entries: AgentTranscriptEntry[]) => AgentTranscriptEntry[]) => void,
  updateRun: (run: ActiveAgentRun | undefined) => void,
  onConnected: () => void,
): Promise<InvokeAgentTurnResult | undefined> {
  const { api, runId, streamingId } = run
  while (isCurrent()) {
    let batch = await subscribeAgentRunWithRetry(api, runId, run.cursor, run.sessionId)
    if (!isCurrent()) return undefined
    const replayExpired = batch.replayExpired
    const pendingApprovals = replayExpired ? batch.pendingApprovals ?? [] : []
    if (batch.replayExpired) {
      const snapshot = batch
      const transcript = await loadTranscript(api, run.sessionId)
      if (!isCurrent()) return undefined
      if (!snapshot.done) {
        batch = await subscribeAgentRunWithRetry(api, runId, snapshot.nextCursor, run.sessionId)
        if (!isCurrent()) return undefined
        if (batch.replayExpired) {
          run.cursor = snapshot.nextCursor
          continue
        }
      }
      const committedDuringRead = batch !== snapshot && batch.events.some(event =>
        event.type === 'transcript-appended' && Array.isArray(event.entries)
        && (event.entries as unknown as AgentTranscriptEntry[]).some(entry =>
          entry.runId === runId && (entry.entry.kind === 'tool-invocation'
            || entry.entry.kind === 'message' && entry.entry.role === 'assistant')))
      updateMessages(current => {
        const committed = transcript.entries.filter(entry => entry.runId === runId)
        const committedIds = new Set(committed.map(entry => entry.id))
        const placeholder = current.find(entry => entry.id === streamingId)
        const entries = [
          ...current.filter(entry => entry.runId !== runId && entry.id !== streamingId
            && entry.id !== run.optimisticEntryId && !committedIds.has(entry.id)),
          ...committed,
        ].sort((a, b) => a.sequence - b.sequence)
        if (placeholder) entries.push({
          ...placeholder, sequence: (entries.at(-1)?.sequence ?? 0) + 1,
          entry: { kind: 'message', role: 'assistant', content: committedDuringRead ? '' : snapshot.partialText ?? '' },
        })
        return entries
      })
      updateRun({ runId, status: batch.state })
    }
    onConnected()
    run.cursor = batch.nextCursor
    for (const event of [...pendingApprovals, ...batch.events]) {
      if (event.type === 'transcript-appended' && Array.isArray(event.entries)) {
        const appended = event.entries as unknown as AgentTranscriptEntry[]
        updateMessages(current => mergeAgentRunEntries(current, appended, run))
      }
      if (event.type === 'text-delta' && typeof event.delta === 'string' && streamingId) {
        updateMessages(entries => entries.map(entry => entry.id === streamingId
          ? { ...entry, entry: { ...entry.entry, content: `${entry.entry.content ?? ''}${event.delta}` } }
          : entry))
      }
      if (event.type === 'mutation-approval-requested'
        && typeof event.requestId === 'string'
        && event.preview
        && typeof event.preview === 'object') {
        updateRun({
          runId,
          status: 'running',
          approval: {
            requestId: event.requestId,
            preview: event.preview as NonNullable<AgentMutationApproval['preview']>,
          },
        })
      }
      if (event.type === 'history-read-approval-requested'
        && typeof event.requestId === 'string' && event.action && typeof event.action === 'object') {
        updateRun({
          runId, status: 'running',
          approval: {
            requestId: event.requestId,
            action: event.action as NonNullable<AgentMutationApproval['action']>,
          },
        })
      }
      if (event.type === 'completed' && event.result && typeof event.result === 'object') {
        run.status = 'completed'
        updateRun({ runId, status: 'completed' })
        return event.result as unknown as InvokeAgentTurnResult
      }
      if (event.type === 'failed') {
        run.status = 'failed'
        updateRun({ runId, status: 'failed' })
        throw new Error(typeof event.error === 'object' && event.error && 'message' in event.error
          ? String(event.error.message)
          : 'Agent turn failed')
      }
      if (event.type === 'cancelled') {
        run.status = 'cancelled'
        updateRun({ runId, status: 'cancelled' })
        return undefined
      }
      if (event.type === 'suspended') {
        run.status = 'suspended'
        updateRun({ runId, status: 'suspended' })
        return undefined
      }
    }
    if (batch.done) {
      run.status = batch.state
      updateRun({ runId, status: batch.state })
      if (batch.state === 'cancelled' || batch.state === 'suspended') return undefined
      if (replayExpired && batch.state === 'completed') return undefined
      throw new Error(`Agent run ended without a completed result: ${runId}`)
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

export function mergeAgentRunEntries(
  current: AgentTranscriptEntry[],
  appended: AgentTranscriptEntry[],
  run: Pick<ObservedRun, 'optimisticEntryId' | 'streamingId'>,
): AgentTranscriptEntry[] {
  const receivedIds = new Set(appended.map(entry => entry.id))
  const hasUser = appended.some(entry => entry.entry.kind === 'message' && entry.entry.role === 'user')
  const committedStep = appended.some(entry => entry.entry.kind === 'message' && entry.entry.role === 'assistant'
    || entry.entry.kind === 'tool-invocation')
  const placeholder = current.find(entry => entry.id === run.streamingId)
  const entries = [
    ...current.filter(entry => entry.id !== run.streamingId && !receivedIds.has(entry.id)
      && (!hasUser || entry.id !== run.optimisticEntryId)),
    ...appended,
  ].sort((a, b) => a.sequence - b.sequence)
  if (placeholder) {
    entries.push({
      ...placeholder,
      sequence: (entries.at(-1)?.sequence ?? 0) + 1,
      entry: committedStep ? { kind: 'message', role: 'assistant', content: '' } : placeholder.entry,
    })
  }
  return entries
}

async function subscribeAgentRunWithRetry(
  api: StudioApi,
  runId: string,
  cursor: number,
  agentSessionId: string,
) {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await api.agentSessions.subscribeRun(runId, cursor, agentSessionId)
    } catch (error) {
      lastError = error
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
      }
    }
  }
  throw lastError
}

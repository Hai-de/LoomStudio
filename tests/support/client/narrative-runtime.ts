import { afterEach, beforeEach, vi } from 'vitest'
import type { FormEvent } from 'react'
import { useNarrativeRuntime } from '../../../apps/studio-client/src/features/narrative-runtime/model/use-narrative-runtime.js'
import type { StudioApi } from '../../../apps/studio-client/src/shared/api/studio-api.js'
import type { DataOperation } from '../../../apps/studio-client/src/shared/api/data-commit-events.js'
import type { AgentSession, AgentTranscriptEntry } from '../../../apps/studio-client/src/entities/index.js'

const hooks = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
  commitEffect: undefined as (() => void | (() => void)) | undefined,
  onCommit: undefined as ((operations: Array<{ entityType: string; entityId: string }>) => void) | undefined,
  narrativeConnected: undefined as (() => void) | undefined,
  sessionEffect: undefined as (() => void | (() => void)) | undefined,
  sessionCommit: undefined as ((operations: DataOperation[]) => void) | undefined,
  connected: undefined as (() => void) | undefined,
  subscribingSessions: false,
}))
export { hooks }
vi.mock('../../../apps/studio-client/src/shared/api/data-commit-events.js', () => ({
  subscribeDataCommits: (onCommit: typeof hooks.sessionCommit, connected: () => void) => {
    if (hooks.subscribingSessions) {
      hooks.sessionCommit = onCommit
      hooks.connected = connected
      return () => { hooks.sessionCommit = undefined }
    }
    hooks.onCommit = onCommit
    hooks.narrativeConnected = connected
    return () => { hooks.onCommit = undefined }
  },
}))
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useEffect: (effect: () => void, deps?: unknown[]) => {
    if (deps?.length === 3 && typeof deps[1] === 'string' && typeof deps[2] === 'string') hooks.commitEffect = effect
    if (deps?.length === 2 && deps[1] === 'timeline') hooks.sessionEffect = effect
  },
  useState: (initial: unknown) => {
    const index = hooks.cursor++
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? initial() : initial
    return [hooks.values[index], (value: unknown) => {
      hooks.values[index] = typeof value === 'function' ? value(hooks.values[index]) : value
    }]
  },
  useRef: (initial: unknown) => {
    const index = hooks.cursor++
    if (!(index in hooks.values)) hooks.values[index] = { current: initial }
    return hooks.values[index]
  },
}))

beforeEach(() => { hooks.cursor = 0; hooks.values = []; hooks.commitEffect = undefined; hooks.onCommit = undefined
  hooks.narrativeConnected = undefined
  hooks.sessionEffect = undefined; hooks.sessionCommit = undefined; hooks.connected = undefined; hooks.subscribingSessions = false })
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

export function fixture() {
  const timeline = {
    id: 'timeline', activeBranchId: 'branch', promptResourceIds: [],
    createdAt: '2026-09-23', updatedAt: '2026-09-23',
  }
  const branch = {
    id: 'branch', timelineId: timeline.id, stateHeadRevisionId: 'state',
    createdAt: timeline.createdAt, updatedAt: timeline.updatedAt,
  }
  const session: AgentSession = {
    id: 'session', timelineId: timeline.id, agentPresetId: 'profile',
    entryCount: 0, createdAt: timeline.createdAt, updatedAt: timeline.updatedAt,
  }
  const narrative: Awaited<ReturnType<StudioApi['narratives']['getPage']>> = { timeline, branch, nodes: [] }
  const result = {
    narrative, agentSession: session,
    entries: {
      user: {
        id: 'user', agentSessionId: session.id, sequence: 1, createdAt: timeline.createdAt,
        entry: { kind: 'message', role: 'user', content: 'Draft' },
      } satisfies AgentTranscriptEntry,
      assistant: {
        id: 'assistant', agentSessionId: session.id, sequence: 2, createdAt: timeline.createdAt,
        entry: { kind: 'message', role: 'assistant', content: 'Reply' },
      } satisfies AgentTranscriptEntry,
    },
  }
  const createTimeline = vi.fn(async () => narrative)
  const appendInput = vi.fn<StudioApi['narratives']['appendInput']>(async input => {
    const node = { id: input.nodeId, timelineId: timeline.id, stateRevisionId: 'state',
      body: { format: 'loom-markdown.v1' as const, raw: input.content }, createdAt: timeline.createdAt }
    Object.assign(branch, { headNodeId: node.id })
    Object.assign(narrative, { nodes: [node] })
    return { timeline, branch, node, mutation: { changesetId: 'input-commit' } }
  })
  const createSession = vi.fn<StudioApi['agentSessions']['create']>(async () => ({
    session, mutation: { changesetId: 'create-session' },
  }))
  const createRun = vi.fn(async () => ({ runId: 'run' }))
  const subscribeRun = vi.fn<StudioApi['agentSessions']['subscribeRun']>(async () => ({
    events: [{ type: 'completed', runId: 'run', result }], nextCursor: 1, done: true, state: 'completed',
  }))
  const getTranscript = vi.fn<StudioApi['agentSessions']['getTranscript']>(async () => ({
    session, entries: [result.entries.user, result.entries.assistant],
  }))
  const getPage = vi.fn<StudioApi['narratives']['getPage']>(async () => narrative)
  const resumeRun = vi.fn(async () => ({ runId: 'continued', accepted: true }))
  const acknowledgeRunCompletion = vi.fn(async (runId: string) => ({ runId, accepted: true }))
  const reportFailure = vi.fn<(error: unknown) => void>()
  const input: Parameters<typeof useNarrativeRuntime>[0] = {
    api: {
      narratives: { create: createTimeline, appendInput, getPage },
      agentSessions: {
        create: createSession, createRun, subscribeRun, getTranscript, resumeRun, acknowledgeRunCompletion,
      },
    } as unknown as StudioApi,
    storageScope: 'test', initialInput: '  Draft\n', selectedCardId: 'card', selectedAgentPresetId: 'profile',
    onSelectCard: vi.fn(), onSelectAgentPreset: vi.fn(),
    runAgentAction: async action => { try { await action() } catch (error) { reportFailure(error) } },
    // Same boolean completion contract as useStudioState's runReported adapter.
    runAction: async action => {
      try { await action(); return true } catch (error) { reportFailure(error); return false }
    },
    runLatestAction: action => action({ isCurrent: () => true } as never),
  }
  const render = () => { hooks.cursor = 0; return useNarrativeRuntime(input) }
  const event = { preventDefault: vi.fn() } as unknown as FormEvent
  return { render, event, input, result, appendInput, createTimeline, createSession, createRun, subscribeRun, getTranscript, getPage, resumeRun, acknowledgeRunCompletion, reportFailure }
}

export async function primaryFixture() {
  const f = fixture()
  const primary = await f.render().createAgentSession('profile', true)
  f.input.api.agentSessions.list = vi.fn(async () => ({ sessions: [primary!] }))
  f.getTranscript.mockResolvedValueOnce({ session: primary!, entries: [] })
  await f.render().activateAgentSession(primary!)
  f.getTranscript.mockClear()
  return f
}

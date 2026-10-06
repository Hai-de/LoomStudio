import { isRecord, type ChatMessage, type JsonObject } from '@loom-studio/shared'
import type { AgentStore, AgentTranscriptEntry } from '@loom-studio/application-data'
import type { InvokeAgentTurnInput, ProviderModelSelection } from '../types.js'

export type AgentRunRecoveryCheckpoint = {
  version: 1
  phase: 'provider' | 'tools'
  executor: { pid: number; id: string }
  request: InvokeAgentTurnInput
  model: ProviderModelSelection
  toolContract: string
  messages: ChatMessage[]
  userEntryId: string
  nextProviderStep: number
  partialEntryId?: string
}

export type AgentRunRecovery = {
  request: InvokeAgentTurnInput
  continuation: {
    sourceRunId: string
    messages: ChatMessage[]
    userEntry: AgentTranscriptEntry
    partialEntryId?: string
    recovery: AgentRunRecoveryCheckpoint
    expectedEntryCount: number
  }
}

const activeExecutors = new Set<string>()

export function registerAgentExecutor(id: string): () => void {
  activeExecutors.add(id)
  return () => { activeExecutors.delete(id) }
}

export function encodeRunRecovery(checkpoint: AgentRunRecoveryCheckpoint): JsonObject {
  // Persist only JSON fields; optional request properties can contain undefined in memory.
  return JSON.parse(JSON.stringify(checkpoint)) as JsonObject
}

function recoveryError(code: string, message: string): Error {
  return Object.assign(new Error(message), { code: `agent.recovery_${code}` })
}

function assertExecutorStopped(executor: AgentRunRecoveryCheckpoint['executor']): void {
  if (executor.pid === process.pid) {
    if (activeExecutors.has(executor.id)) throw recoveryError('executor_active', 'The original Agent executor is still active')
    return
  }
  try {
    process.kill(executor.pid, 0)
  } catch (error) {
    if (isRecord(error) && error.code === 'ESRCH') return
    throw recoveryError('executor_unknown', 'Cannot confirm that the original Agent executor has stopped')
  }
  throw recoveryError('executor_active', 'The original Agent process is still alive')
}

function parseCheckpoint(value: JsonObject): AgentRunRecoveryCheckpoint {
  if (!isRecord(value) || value.version !== 1 || !['provider', 'tools'].includes(String(value.phase))
    || !isRecord(value.executor) || !Number.isSafeInteger(value.executor.pid) || Number(value.executor.pid) <= 0
    || typeof value.executor.id !== 'string' || !value.executor.id
    || !isRecord(value.request) || typeof value.request.agentSessionId !== 'string' || typeof value.request.input !== 'string'
    || !isRecord(value.model) || typeof value.model.providerProfileId !== 'string' || typeof value.model.modelId !== 'string'
    || typeof value.toolContract !== 'string' || typeof value.userEntryId !== 'string'
    || !Number.isSafeInteger(value.nextProviderStep) || Number(value.nextProviderStep) < 1
    || !Array.isArray(value.messages) || !value.messages.length || !value.messages.every(message => isRecord(message)
      && ['system', 'developer', 'user', 'assistant', 'tool'].includes(String(message.role))
      && (message.content === undefined || message.content === null || typeof message.content === 'string' || Array.isArray(message.content)))
    || (value.partialEntryId !== undefined && typeof value.partialEntryId !== 'string')) {
    throw recoveryError('checkpoint_invalid', 'Agent recovery checkpoint is incomplete or unsupported')
  }
  const target = value.request.narrativeTarget
  if (target !== undefined && (!isRecord(target) || typeof target.timelineId !== 'string'
    || typeof target.branchId !== 'string' || (target.inputNodeId !== undefined && typeof target.inputNodeId !== 'string'))) {
    throw recoveryError('checkpoint_invalid', 'The original Narrative target is incomplete')
  }
  return value as unknown as AgentRunRecoveryCheckpoint
}

export async function readAgentRunRecovery(
  agents: AgentStore,
  input: { agentSessionId: string; runId?: string },
): Promise<AgentRunRecovery | undefined> {
  const entries: AgentTranscriptEntry[] = []
  let cursor: string | undefined
  let entryCount = 0
  do {
    const page = await agents.getEntryPage({ agentSessionId: input.agentSessionId, cursor, limit: 100 })
    if (cursor && page.session.entryCount !== entryCount) throw recoveryError('conflict', 'Agent transcript changed while reading its checkpoint')
    entryCount = page.session.entryCount
    entries.push(...page.entries)
    cursor = page.nextCursor
  } while (cursor)
  entries.sort((left, right) => left.sequence - right.sequence)
  const latestState = entries.findLast(item => item.entry.kind === 'run-state')
  if (!latestState || latestState.entry.kind !== 'run-state') return undefined
  if (input.runId && input.runId !== latestState.runId) throw recoveryError('superseded', 'This Run was superseded by a later Run')
  if (latestState.entry.state === 'completed' || latestState.entry.state === 'discarded' || latestState.entry.state === 'aborted') return undefined
  const checkpointEntry = entries.findLast(item => item.runId === latestState.runId && item.entry.kind === 'run-state' && item.entry.recovery)
  if (!checkpointEntry || checkpointEntry.entry.kind !== 'run-state' || !checkpointEntry.entry.recovery) {
    throw recoveryError('checkpoint_missing', 'This Run has no durable checkpoint; it cannot be resumed without reconstructing its missing context')
  }
  const checkpoint = parseCheckpoint(checkpointEntry.entry.recovery)
  if (checkpoint.request.agentSessionId !== input.agentSessionId || checkpoint.executor.id !== latestState.runId) {
    throw recoveryError('checkpoint_invalid', 'Agent checkpoint identity does not match the Run')
  }
  assertExecutorStopped(checkpoint.executor)
  if (checkpoint.phase === 'tools' || entries.some(item => item.sequence > checkpointEntry.sequence
    && item.runId === latestState.runId && (item.entry.kind === 'tool-invocation' || item.entry.kind === 'tool-result'))) {
    throw recoveryError('tool_outcome_unknown', 'The interrupted tool step has no complete recovery checkpoint; completed side effects will not be repeated')
  }
  const userEntry = entries.find(item => item.id === checkpoint.userEntryId)
  if (!userEntry || userEntry.entry.kind !== 'message' || userEntry.entry.role !== 'user') {
    throw recoveryError('checkpoint_invalid', 'The original Agent user entry is missing')
  }
  if (entries.some(item => item.sequence > checkpointEntry.sequence && (item.entry.kind === 'work-summary'
    || item.entry.kind === 'message' && item.entry.role === 'user'))) {
    throw recoveryError('superseded', 'New input or a work summary superseded this checkpoint')
  }
  return {
    request: checkpoint.request,
    continuation: {
      sourceRunId: latestState.runId!,
      messages: checkpoint.messages, userEntry,
      ...(checkpoint.partialEntryId ? { partialEntryId: checkpoint.partialEntryId } : {}),
      recovery: checkpoint, expectedEntryCount: entryCount,
    },
  }
}

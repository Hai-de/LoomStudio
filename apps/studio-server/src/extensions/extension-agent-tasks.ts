import { setTimeout as delay } from 'node:timers/promises'
import { defaultSessionSummaryPolicy, type ApplicationRuntime } from '@loom-studio/application-runtime'
import { extensionInstallationId } from '@loom-studio/extension-sdk'
import type { JsonObject } from '@loom-studio/shared'
import type { DocumentStore } from '@loom-studio/document-store'
import { getAgentRunService } from '../agents/agent-run-service.js'

type Owner = { packageId: string; installationId: string }
type Target = { timelineId: string; branchId: string }
type Ownership = Owner & Target & { sessionId: string; presetId: string }
const documentType = 'application.extension-agent-task'
const documentId = (sessionId: string) => `extension-agent-task:${sessionId}`

export function createExtensionAgentTasks({ runtime, documents }: { runtime: ApplicationRuntime; documents: DocumentStore }) {
  const runs = getAgentRunService(runtime)
  async function requireTask(owner: Owner, target: Target, sessionId: string, signal?: AbortSignal) {
    signal?.throwIfAborted()
    const document = await documents.get(documentId(sessionId))
    const record = document?.content as Ownership | undefined
    if (document?.type !== documentType || document.meta.ownerExtensionId !== undefined || document.meta.ownerInstallationId !== undefined || !record || record.sessionId !== sessionId
      || record.packageId !== owner.packageId || record.installationId !== owner.installationId
      || record.timelineId !== target.timelineId || record.branchId !== target.branchId) {
      throw new Error('Extension Agent task does not belong to this installation and Timeline branch')
    }
    const { session } = await runtime.getAgentSession({ agentSessionId: sessionId })
    if (session.deletedAt || session.timelineId !== target.timelineId || session.agentPresetId !== record.presetId)
      throw new Error('Extension Agent task Session binding is unavailable')
    signal?.throwIfAborted()
    return session
  }
  async function read(owner: Owner, target: Target, sessionId: string, signal?: AbortSignal) {
    const session = await requireTask(owner, target, sessionId, signal)
    let cursor: string | undefined
    let lastOutput: string | undefined
    let state: string = 'idle'
    do {
      signal?.throwIfAborted()
      const page = await runtime.getAgentTranscriptPage({ agentSessionId: sessionId, cursor, limit: 100 })
      for (const item of page.entries) {
        if (item.entry.kind === 'message' && item.entry.role === 'assistant') lastOutput = item.entry.content
        if (item.entry.kind === 'run-state') {
          state = item.entry.state
        }
      }
      cursor = page.nextCursor
    } while (cursor)
    // The shared service owns live state and recovery semantics, including interrupted runs.
    const task = (await runs.list({ timelineId: target.timelineId })).tasks.find(task => task.agentSessionId === sessionId)
    if (task) state = task.state
    else if (state === 'running' || state === 'created') state = 'interrupted'
    else if (state === 'aborted') state = 'cancelled'
    signal?.throwIfAborted()
    return { sessionId, presetId: session.agentPresetId, ...(session.title === undefined ? {} : { title: session.title }), state,
      ...(lastOutput === undefined ? {} : { lastOutput }) }
  }
  return {
    async create(owner: Owner, target: Target, input: ({ presetId: string } | { presetContributionId: string }) & { title?: string }, signal?: AbortSignal) {
      signal?.throwIfAborted()
      let presetId: string
      if ('presetId' in input) {
        presetId = input.presetId
        if (!presetId.trim()) throw new Error('Agent task presetId is required')
      } else {
        if (!input.presetContributionId.trim()) throw new Error('Agent task presetContributionId is required')
        const matches: string[] = []
        let cursor: string | undefined
        do {
          signal?.throwIfAborted()
          const page = await runtime.listAgentPresets({ limit: 100, cursor })
          for (const preset of page.agentPresets) {
            const origin = preset.origin
            if (origin?.kind === 'extension-package' && origin.packageId === owner.packageId
              && (origin.installationId ?? extensionInstallationId(origin.packageId, { kind: 'global' })) === owner.installationId
              && origin.contributionId === input.presetContributionId) matches.push(preset.id)
          }
          cursor = page.nextCursor
        } while (cursor)
        if (matches.length !== 1) throw new Error(`Agent task preset contribution must resolve to exactly one owned Preset: ${input.presetContributionId}`)
        presetId = matches[0]!
      }
      signal?.throwIfAborted()
      const { session } = await runtime.createAgentSession({ agentPresetId: presetId, timelineId: target.timelineId,
        ...(input.title === undefined ? {} : { title: input.title }) }, { abortSignal: signal })
      await runtime.updateAgentSession({ agentSessionId: session.id, summaryPolicy: { ...defaultSessionSummaryPolicy, enabled: false } }, { abortSignal: signal })
      await documents.write({ id: documentId(session.id), type: documentType, expectedVersion: 'new',
        content: { ...owner, ...target, sessionId: session.id, presetId } })
      return read(owner, target, session.id, signal)
    },
    read,
    async invoke(owner: Owner, target: Target, input: { sessionId: string; input: string; activationFacts?: JsonObject }, signal?: AbortSignal) {
      await requireTask(owner, target, input.sessionId, signal)
      if (!input.input.trim()) throw new Error('Agent task input is required')
      const { runId } = await runs.create({ agentSessionId: input.sessionId, input: input.input, contextMode: 'isolated',
        ...(input.activationFacts === undefined ? {} : { activationFacts: structuredClone(input.activationFacts) }) })
      const abort = () => { runs.cancel(runId, 'extension-scope-ended') }
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) abort()
      try {
        signal?.throwIfAborted()
        let cursor = 0
        while (true) {
          const page = await runs.subscribe(runId, cursor, input.sessionId)
          cursor = page.nextCursor
          signal?.throwIfAborted()
          for (const event of page.events) {
            if (event.type === 'failed') throw new Error(event.error.message)
            if (event.type === 'cancelled') throw new Error(event.reason ?? 'Agent task cancelled')
            if (event.type === 'completed') {
              const assistant = event.result.entries.assistant.entry
              return { sessionId: input.sessionId, runId, state: page.state,
                ...(assistant.kind === 'message' ? { text: assistant.content } : {}) }
            }
          }
          if (page.done) {
            if (page.state === 'failed' || page.state === 'cancelled') throw new Error(`Agent task ${page.state}`)
            return { sessionId: input.sessionId, runId, state: page.state }
          }
          await delay(50, undefined, { signal })
        }
      } finally {
        signal?.removeEventListener('abort', abort)
      }
    },
    async cancel(owner: Owner, target: Target, sessionId: string, signal?: AbortSignal) {
      await requireTask(owner, target, sessionId, signal)
      const task = (await runs.list({ timelineId: target.timelineId })).tasks.find(task => task.agentSessionId === sessionId)
      signal?.throwIfAborted()
      if (!task || !task.canPause) return { sessionId, state: task?.state ?? 'idle', accepted: false }
      return { sessionId, ...runs.cancel(task.runId, 'extension-task-cancelled') }
    },
  }
}

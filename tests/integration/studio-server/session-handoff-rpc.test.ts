import { describe, expect, it } from 'vitest'
import { officialFakeModelId } from '@loom-studio/ai-gateway'
import type { ApplicationRuntime, AgentTranscriptPage, CompleteAgentSessionHandoffResult, PreviewAgentTurnResult } from '@loom-studio/application-runtime'
import { callRpc, withStudioServer } from './helpers.js'

describe('Session handoff RPC', () => {
  it('validates input and commits a handoff without deleting the old conversation', async () => {
    await withStudioServer(async port => {
      const { providerProfile } = await callRpc<{ providerProfile: { id: string } }>(port, 'application.createProviderProfile', {
        providerExtensionId: 'official.fake', displayName: 'Test', config: {}, enabledModelIds: [officialFakeModelId],
      })
      const { resource } = await callRpc<{ resource: { id: string } }>(port, 'application.createPromptResource', { resourceKind: 'preset', name: 'Writer' })
      const { agentPreset } = await callRpc<{ agentPreset: { id: string } }>(port, 'application.updateAgentPreset', {
        name: 'Writer', agentPresetId: resource.id, expectedVersion: (await callRpc<{ resource: { version: number } }>(port, 'application.getPromptResource', { resourceId: resource.id })).resource.version, model: { providerProfileId: providerProfile.id, modelId: officialFakeModelId },
      })
      const { session } = await callRpc<{ session: { id: string } }>(port, 'application.createAgentSession', { agentPresetId: agentPreset.id })
      const input = { agentSessionId: session.id }
      const initialMemory = await callRpc<Awaited<ReturnType<ApplicationRuntime['getAgentSessionMemory']>>>(port, 'application.getAgentSessionMemory', input)
      expect(initialMemory.summary).toBeNull()
      expect(initialMemory.policy.maxTokens).toBe(5000)
      await callRpc(port, 'application.invokeAgentTurn', { ...input, input: 'OLD_USER_REQUEST' })
      const before = await callRpc<AgentTranscriptPage>(port, 'application.getAgentTranscriptPage', input)
      await expect(callRpc(port, 'application.completeAgentSessionHandoff', {
        ...input, expectedEntryCount: 'invalid', summary: 'Handoff',
      })).rejects.toThrow()
      const completed = await callRpc<CompleteAgentSessionHandoffResult>(port, 'application.completeAgentSessionHandoff', {
        ...input, expectedEntryCount: before.session.entryCount, summary: 'WORK_RECORD: finish pending task',
      })
      const memory = await callRpc<Awaited<ReturnType<ApplicationRuntime['getAgentSessionMemory']>>>(port, 'application.getAgentSessionMemory', input)
      expect(memory.summary?.entry).toMatchObject({ kind: 'work-summary', content: 'WORK_RECORD: finish pending task' })
      expect(completed.memoryNotification.status).toBe('not-configured')
      expect(completed.session.entryCount).toBe(before.session.entryCount + 1)
      const preview = await callRpc<PreviewAgentTurnResult>(port, 'application.previewAgentTurn', { ...input, input: 'NEW_USER_REQUEST' })
      expect(JSON.stringify(preview.messages)).toContain('WORK_RECORD: finish pending task')
      expect(JSON.stringify(preview.messages)).not.toContain('OLD_USER_REQUEST')
      const after = await callRpc<AgentTranscriptPage>(port, 'application.getAgentTranscriptPage', input)
      expect(after.entries.slice(0, -1)).toEqual(before.entries)
      await callRpc(port, 'application.updateAgentSessionSummary', { ...input, expectedSummaryId: memory.summary!.id,
        expectedEntryCount: memory.session.entryCount, content: 'CORRECTED_WORK_RECORD' })
      const corrected = await callRpc<Awaited<ReturnType<ApplicationRuntime['getAgentSessionMemory']>>>(port, 'application.getAgentSessionMemory', input)
      expect(corrected.summary?.entry).toMatchObject({ content: 'CORRECTED_WORK_RECORD' })
      expect(corrected.coverage).toEqual(memory.coverage)

      await expect(callRpc(port, 'application.completeAgentSessionHandoff', {
        ...input, expectedEntryCount: before.session.entryCount, summary: 'Stale handoff',
      })).rejects.toThrow(/count conflict/)
    })
  })
})


describe('Workspace UI RPC', () => {
  it('roundtrips binary bytes and rejects stale and forged file writes', async () => {
    await withStudioServer(async port => {
      const { card } = await callRpc<{ card: { id: string } }>(port, 'application.createCard', { name: 'Workspace' })
      const { timeline, branch } = await callRpc<{ timeline: { id: string }; branch: { id: string } }>(port, 'application.createNarrativeTimeline', { cardId: card.id })
      const target = { timelineId: timeline.id, branchId: branch.id }
      const baseline = await callRpc<Awaited<ReturnType<ApplicationRuntime['getTimelineWorkspace']>>>(port, 'application.getTimelineWorkspace', target)
      const update = { ...target, expectedRevisionId: baseline.id, operations: [
        { kind: 'create', entry: { id: 'image', kind: 'file', name: 'oc.png', content: { text: '' } } },
        { kind: 'write', entryId: 'image', content: [0, 127, 255], mediaType: 'image/png' },
      ] }
      await callRpc(port, 'application.mutateTimelineWorkspace', update)
      expect(await callRpc(port, 'application.readWorkspaceFile', { ...target, entryId: 'image' })).toMatchObject({ bytes: [0, 127, 255] })
      await expect(callRpc(port, 'application.mutateTimelineWorkspace', update)).rejects.toThrow('changed')
      await expect(callRpc(port, 'application.mutateTimelineWorkspace', { ...update, operations: [
        { kind: 'write', entryId: 'image', content: [256] },
      ] })).rejects.toThrow()
      await expect(callRpc(port, 'application.mutateTimelineWorkspace', { ...update, operations: [
        { kind: 'create', entry: { id: 'forged', kind: 'file', name: 'secret', content: { blobId: 'unowned-blob' } } },
      ] })).rejects.toThrow()
      await expect(callRpc(port, 'application.getTimelineWorkspace', { ...target, timelineId: 'another-timeline' })).rejects.toThrow('unavailable')
    })
  })
})

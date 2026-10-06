import { describe, expect, it, vi } from 'vitest'
import { useStudioDerivedValues } from '../../../apps/studio-client/src/app/use-studio-derived-values.js'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'

vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof import('react')>(),
  useMemo: (factory: () => unknown) => factory(),
}))

const input: Parameters<typeof useStudioDerivedValues>[0] = {
  t: createTranslator('zh-CN'),
  timeline: { id: 'timeline', activeBranchId: 'branch', createdAt: '', updatedAt: '', promptResourceIds: [] },
  branch: { id: 'branch', timelineId: 'timeline', createdAt: '', updatedAt: '' },
  nodes: [], narrativeInput: 'Continue', agentInput: 'Hello',
  sessionBusy: false, agentChatBusy: false, agentSessionReady: true,
  activationFacts: undefined, macroPreview: { key: 'test' }, macroKey: 'test',
}
const session = { id: 'writer', timelineId: 'timeline', agentPresetId: 'preset', entryCount: 0, createdAt: '', updatedAt: '' }

describe('Studio send target availability', () => {
  it('enables Narrative sending for the primary Session without a separately selected preset', () => {
    expect(useStudioDerivedValues({ ...input, primarySession: session }).canSend).toBe(true)
    expect(useStudioDerivedValues({ ...input, selectedAgentPreset: {} }).canSend).toBe(false)
    expect(useStudioDerivedValues({ ...input, primarySession: { ...session, timelineId: 'other' } }).canSend).toBe(false)
  })

  it('enables an existing Agent Session without requiring another preset selection', () => {
    expect(useStudioDerivedValues({ ...input, agentSession: session }).canSendAgent).toBe(true)
  })
})

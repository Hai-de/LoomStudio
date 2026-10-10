import { describe, expect, it } from 'vitest'
import type { NarrativeNode } from '../../../apps/studio-client/src/entities/index.js'
import { isTimelineNearBottom, readNarrativeNodeRole, resolveNarrativeDisplayText } from '../../../apps/studio-client/src/widgets/narrative-timeline/narrative-timeline.js'

describe('NarrativeTimeline.isTimelineNearBottom', () => {
  it('follows composer growth only near the latest messages', () => {
    expect(isTimelineNearBottom({ clientHeight: 600, scrollHeight: 1200, scrollTop: 560 })).toBe(true)
    expect(isTimelineNearBottom({ clientHeight: 600, scrollHeight: 1200, scrollTop: 400 })).toBe(false)
  })
})

describe('NarrativeTimeline.readNarrativeNodeRole', () => {
  it('recognizes the user node in a persisted user-assistant Run pair', () => {
    const nodes = [
      {
        id: 'user-node',
        source: { agentSessionId: 'session-1', agentMessageId: 'message-user', runId: 'run-1' },
      },
      {
        id: 'assistant-node',
        parentNodeId: 'user-node',
        source: { agentSessionId: 'session-1', agentMessageId: 'message-assistant', runId: 'run-1' },
      },
    ] as NarrativeNode[]

    expect(readNarrativeNodeRole(nodes, 0)).toBe('user')
    expect(readNarrativeNodeRole(nodes, 1)).toBe('assistant')
  })

  it('keeps legacy standalone Narrative nodes as assistant content', () => {
    expect(readNarrativeNodeRole([{ id: 'legacy-node' } as NarrativeNode], 0)).toBe('assistant')
  })

  it('recognizes optimistic narrative nodes as user content', () => {
    expect(readNarrativeNodeRole([{ id: 'optimistic-narrative-node-1' } as NarrativeNode], 0)).toBe('user')
  })
})

describe('NarrativeTimeline.resolveNarrativeDisplayText (FE-035)', () => {
  it('uses projected text directly when available', () => {
    expect(resolveNarrativeDisplayText('projected content', 'raw content')).toBe('projected content')
  })

  it('gracefully falls back to raw text when projection errors out without cache', () => {
    expect(resolveNarrativeDisplayText(undefined, 'raw content', undefined, { error: 'Failed to fetch' })).toBe('raw content')
  })

  it('retains cached display text during error if raw text matches', () => {
    expect(resolveNarrativeDisplayText(undefined, 'raw content', { raw: 'raw content', text: 'cached projected' }, { error: 'Failed to fetch' })).toBe('cached projected')
  })

  it('falls back to raw text when cache belongs to previous edited raw text during error', () => {
    expect(resolveNarrativeDisplayText(undefined, 'new raw content', { raw: 'old raw content', text: 'old projected' }, { error: 'Failed to fetch' })).toBe('new raw content')
  })

  it('shows empty string while pending on cold mount without cached display', () => {
    expect(resolveNarrativeDisplayText(undefined, 'raw content', undefined, { pending: true })).toBe('')
  })

  it('keeps cached display text while re-projecting in pending state', () => {
    expect(resolveNarrativeDisplayText(undefined, 'raw content', { raw: 'raw content', text: 'cached' }, { pending: true })).toBe('cached')
  })
})

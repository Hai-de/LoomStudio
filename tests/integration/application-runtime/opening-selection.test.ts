import { describe, expect, it } from 'vitest'
import { createApplicationRuntime, type CardBundleArtifact } from '@loom-studio/application-runtime'
import { createNarrativeStore, createPromptResourceStore } from '@loom-studio/application-data'
import { createSqliteDataEngine } from '@loom-studio/data-engine'
import { createSqliteDocumentStore } from '@loom-studio/document-store'
import { convertSillyTavernCard } from '../../../extensions/st-data-compat/src/normalizer/card.js'
import { encodeCardBundleZip, decodeCardBundleZip, loadCardBundleFiles } from '../../../apps/studio-server/src/codecs/card-bundle-zip.js'
import { handleTimelineRpc } from '../../../apps/studio-server/src/rpc/handlers/application/timeline.js'
import { handleCardsRpc } from '../../../apps/studio-server/src/rpc/handlers/application/cards.js'
import { unzipSync } from 'fflate'

describe('opening selection', () => {
  it('preserves ST alternatives through ZIP and directory loading', async () => {
    const { artifact } = convertSillyTavernCard({
      spec: 'chara_card_v2', spec_version: '2.0',
      data: { name: 'Hero', first_mes: 'Default', alternate_greetings: ['Forest', 'Harbor'] },
    })
    const archive = encodeCardBundleZip({ artifact, avatar: { bytes: Buffer.from('avatar'), mediaType: 'image/png' } })
    const files = unzipSync(archive)
    expect(Buffer.from(files['opening/alternatives/1/0.md']!).toString()).toBe('Harbor')
    const decoded = await decodeCardBundleZip(archive)
    const loaded = await loadCardBundleFiles(async path => files[path]!)
    for (const card of [decoded.artifact.card, loaded.bundle.artifact.card]) {
      expect(card.opening).toEqual({
        entries: [{ role: 'assistant', content: 'Default' }],
        alternatives: [
          { entries: [{ role: 'assistant', content: 'Forest' }] },
          { entries: [{ role: 'assistant', content: 'Harbor' }] },
        ],
      })
    }
  })

  it('initializes only the selected sequence, custom text or an explicitly empty opening', async () => {
    let sequence = 0
    const createId = (prefix: string) => `${prefix}-${++sequence}`
    const now = () => new Date().toISOString()
    const engine = createSqliteDataEngine({ filename: ':memory:', createId, now })
    const documents = createSqliteDocumentStore({ engine })
    const runtime = createApplicationRuntime({
      dataEngine: engine, documents,
      narratives: createNarrativeStore({ engine, createId, now }),
      promptResources: createPromptResourceStore({ engine, createId, now }),
    })
    try {
      const created = await runtime.createCard({
        name: 'Hero', userName: 'Player', opening: {
          entries: [{ content: 'Default' }],
          alternatives: [{ entries: [{ content: '{{char}} meets {{user}}' }, { content: 'Second paragraph' }] }],
        },
      })
      const cardId = created.card.id
      const selected = await runtime.createNarrativeTimeline({ cardId, openingIndex: 1 })
      expect(selected.nodes.map(node => node.body.raw)).toEqual(['Hero meets Player', 'Second paragraph'])
      const defaults = await runtime.createNarrativeTimeline({ cardId })
      expect(defaults.nodes.map(node => node.body.raw)).toEqual(['Default'])
      const custom = await runtime.createNarrativeTimeline({ cardId, openingNodes: [{ content: 'My own start' }] })
      expect(custom.nodes.map(node => node.body.raw)).toEqual(['My own start'])
      const empty = await runtime.createNarrativeTimeline({ cardId, openingNodes: [] })
      expect(empty.nodes).toEqual([])
      await expect(runtime.createNarrativeTimeline({ cardId, openingIndex: 2 })).rejects.toThrow('Opening not found')
      await expect(runtime.createNarrativeTimeline({ cardId, openingIndex: -1 })).rejects.toThrow('Invalid opening index')
      await expect(runtime.createNarrativeTimeline({ cardId, openingIndex: 0.5 })).rejects.toThrow('Invalid opening index')
      await expect(runtime.createNarrativeTimeline({ cardId, openingIndex: 0, openingNodes: [] })).rejects.toThrow('not both')
      await handleTimelineRpc(runtime, 'application.createNarrativeTimeline', { cardId, openingIndex: 1 })
      await expect(handleTimelineRpc(runtime, 'application.createNarrativeTimeline', { cardId, openingNodes: [{}] }))
        .rejects.toThrow('Expected opening node content')
      await expect(handleCardsRpc(runtime, 'application.updateCard', {
        cardId, opening: { entries: [], alternatives: [{ entries: [{ content: 'Bad', role: 'system' }] }] },
      })).rejects.toThrow('Expected opening entry role')
      await handleCardsRpc(runtime, 'application.updateCard', {
        cardId, expectedVersion: created.card.version,
        opening: { entries: [{ content: 'Changed default' }], alternatives: [{ entries: [{ content: 'Changed alternative' }] }] },
      })
      expect((await runtime.getCard({ cardId })).card.opening.alternatives?.[0]?.entries[0]?.content).toBe('Changed alternative')
      await expect(runtime.createNarrativeTimeline({ cardId, openingIndex: 1, expectedCardVersion: created.card.version }))
        .rejects.toThrow('Card changed while choosing an opening')
      expect((await runtime.getNarrativePage({ timelineId: selected.timeline.id })).nodes.map(node => node.body.raw))
        .toEqual(['Hero meets Player', 'Second paragraph'])
      const exported = await runtime.exportCardBundle({ cardId })
      expect((exported.artifact as CardBundleArtifact).card.opening).toMatchObject({
        alternatives: [{ entries: [{ content: 'Changed alternative' }] }],
      })
    } finally {
      await engine.close()
    }
  })
})

import { describe, expect, it, vi } from 'vitest'
import { processPrompt } from '../../../packages/application-runtime/src/prompt/process-prompt.js'
import { createPromptProcessorRegistry } from '../../../packages/application-runtime/src/prompt/prompt-processor-registry.js'
import type { PromptDataModel } from '../../../packages/application-runtime/src/prompt/prompt-build-pipeline.js'
import { compilePromptDataModel } from '../../../packages/application-runtime/src/prompt/prompt-build-pipeline.js'

function fixture(): PromptDataModel {
  return {
    skeletonRootId: 'root',
    sourceNodes: [
      { id: 'root', sourceId: 'preset', parentId: null, orderIndex: 0, displayName: 'Preset', kind: 'module' },
      { id: 'inline', sourceId: 'preset', parentId: 'root', orderIndex: 0, displayName: 'Inline', kind: 'entry', body: 'INLINE' },
      { id: 'slot', sourceId: 'preset', parentId: 'root', orderIndex: 1, displayName: 'Slot', kind: 'virtual' },
      { id: 'history', sourceId: 'preset', parentId: 'root', orderIndex: 2, displayName: 'History', kind: 'virtual' },
      { id: 'off', sourceId: 'lore', parentId: null, orderIndex: 0, displayName: 'Disabled', kind: 'entry', enabled: false },
    ],
    contributions: [
      { id: 'late', sourceRef: { kind: 'lore', sourceId: 'lore', sourceNodeId: 'late' },
        content: 'LATE', capabilities: { processorId: 'test/ejs', targetAnchorId: 'slot', localDepth: 2 } },
      { id: 'early', sourceRef: { kind: 'lore', sourceId: 'lore', sourceNodeId: 'early' },
        content: 'EARLY', capabilities: { processorId: 'test/ejs', targetAnchorId: 'slot', localDepth: 1, activation: { kind: 'manual' } } },
      { id: 'inline', sourceRef: { kind: 'preset', sourceId: 'preset', sourceNodeId: 'inline' },
        content: 'INLINE', capabilities: { processorId: 'test/ejs' } },
      { id: 'off', sourceRef: { kind: 'lore', sourceId: 'lore', sourceNodeId: 'off' },
        content: 'OFF', capabilities: { processorId: 'test/ejs', targetAnchorId: 'slot' } },
      { id: 'native', sourceRef: { kind: 'sessionHistory', sourceId: 'session', sourceNodeId: 'native' },
        content: 'SUMMARY', messages: [
          { role: 'assistant', content: null, tool_calls: [{ id: 'call', type: 'function', function: { name: 'read', arguments: '{}' } }] },
          { role: 'tool', content: '<%= untouched %>', tool_call_id: 'call' },
        ], capabilities: { targetAnchorId: 'history' } },
    ],
  }
}

const context = () => ({ mode: 'preview' as const, signal: new AbortController().signal })

describe('authored prompt processing', () => {
  it('prepares activation then renders once in DFS/anchor order, preserving native messages and inputs', async () => {
    const registry = createPromptProcessorRegistry()
    const dispose = vi.fn()
    const rendered: string[] = []
    registry.register({ id: 'test/ejs', create: () => ({
      prepare(entries) {
        expect(entries.map(entry => entry.id)).not.toContain('off')
        return [{ id: 'early', active: true }, { id: 'late', active: false }]
      },
      render(entry) { rendered.push(entry.id); return `${rendered.length}:${entry.content}` },
      dispose,
    }) })
    const input = fixture()
    // Source preparation never emits disabled contributions; exercise the public boundary as well.
    const result = await processPrompt(input, { registry, context: context() })
    expect(rendered).toEqual(['inline', 'early'])
    expect(result.projection.messages.map(message => message.content)).toEqual([
      '1:INLINE\n\n2:EARLY', '', '<%= untouched %>',
    ])
    expect(result.projection.messages.at(-1)?.tool_call_id).toBe('call')
    expect(result.projection.messages.at(-2)?.tool_calls?.[0]?.id).toBe('call')
    expect(input.sourceNodes.find(node => node.id === 'inline')?.body).toBe('INLINE')
    expect(result.model.sourceNodes.find(node => node.id === 'inline')?.body).toBe('1:INLINE')
    expect(result.model.contributions.find(entry => entry.id === 'early')?.content).toBe('2:EARLY')
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('rejects preparation patches outside the selected processor and cleans up', async () => {
    const registry = createPromptProcessorRegistry()
    const dispose = vi.fn()
    registry.register({ id: 'test/ejs', create: () => ({
      prepare: () => [{ id: 'native', content: 'corrupted' }], render: entry => entry.content, dispose,
    }) })
    await expect(processPrompt(fixture(), { registry, context: context() })).rejects.toThrow('Invalid Prompt preparation patch')
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('does not allow processing native history, or silently send templates when the processor is absent', async () => {
    const registry = createPromptProcessorRegistry()
    await expect(processPrompt(fixture(), { registry, context: context() })).rejects.toThrow('unavailable')
    expect(() => compilePromptDataModel(fixture())).toThrow('asynchronous build path')
    const input = fixture()
    input.contributions.at(-1)!.capabilities.processorId = 'test/ejs'
    await expect(processPrompt(input, { registry, context: context() })).rejects.toThrow('only accept authored')
  })

  it('expands ordinary macros only after rendering and removes empty rendered fragments', async () => {
    const registry = createPromptProcessorRegistry()
    const renderText = vi.fn(content => content.replace('{{name}}', 'Loom'))
    registry.register({ id: 'test/ejs', create: () => ({
      render: entry => entry.id === 'inline' ? '{{name}}' : '',
    }) })
    const result = await processPrompt(fixture(), { registry, context: context(), renderText })
    expect(result.projection.messages[0]?.content).toBe('Loom')
    expect(renderText.mock.calls.map(call => call[0])).toEqual(['{{name}}', ''])
  })

  it('aborts an in-flight render on disposal and never starts the next entry', async () => {
    const registry = createPromptProcessorRegistry()
    let started!: () => void
    const entered = new Promise<void>(resolve => { started = resolve })
    const dispose = vi.fn()
    const render = vi.fn()
    const handle = registry.register({ id: 'test/ejs', create: ({ signal }) => ({
      render: () => new Promise<string>((_resolve, reject) => {
        render()
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
        started()
      }),
      dispose,
    }) })
    const pending = processPrompt(fixture(), { registry, context: context() })
    const failure = expect(pending).rejects.toThrow()
    await entered
    handle.dispose()
    await failure
    expect(render).toHaveBeenCalledOnce()
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('isolates Card-scoped registrations and allocates a new session for every build', async () => {
    const registry = createPromptProcessorRegistry()
    const create = vi.fn(() => ({ render: () => '' }))
    registry.register({ id: 'test/ejs', create }, { kind: 'card', cardId: 'a' })
    await expect(processPrompt(fixture(), { registry, context: { ...context(), cardId: 'b' } })).rejects.toThrow('unavailable')
    await processPrompt(fixture(), { registry, context: { ...context(), cardId: 'a' } })
    await processPrompt(fixture(), { registry, context: { ...context(), cardId: 'a' } })
    expect(create).toHaveBeenCalledTimes(2)
  })
})

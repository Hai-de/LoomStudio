import type {
  ExtensionPromptEntry,
  ExtensionPromptProcessingContext,
  ExtensionPromptProcessingSession,
} from '@loom-studio/extension-sdk'
import type { PromptProcessorRegistry } from './prompt-processor-registry.js'
import { emitPromptBlocks, planPromptBlocks, type PromptDataModel } from './prompt-build-pipeline.js'
import type { CompiledPrompt } from './prompt-builder.js'

export type ProcessedPromptSnapshot = {
  sourceNodes: PromptDataModel['sourceNodes']
  contributions: PromptDataModel['contributions']
  projection: CompiledPrompt
}

export type PromptProcessingExecution = {
  processorId: string
  stage: 'prepare' | 'render'
  entryId?: string
}

export async function processPrompt(input: PromptDataModel, processing: {
  registry: PromptProcessorRegistry
  context: ExtensionPromptProcessingContext
  renderText?: (content: string) => string
}) {
  const model = structuredClone(input)
  const nodes = new Map(model.sourceNodes.map(node => [node.id, node]))
  const entries = new Map<string, { processorId: string; entry: ExtensionPromptEntry }>()
  const groups = new Map<string, ExtensionPromptEntry[]>()
  for (const contribution of model.contributions) {
    const processorId = contribution.capabilities.processorId
    if (!processorId) continue
    const kind = contribution.sourceRef.kind
    if (contribution.messages || (kind !== 'preset' && kind !== 'lore'))
      throw new Error('Prompt processors only accept authored Preset and Lore text')
    const node = nodes.get(contribution.sourceRef.sourceNodeId)
    if (node?.enabled === false) continue
    if (entries.has(contribution.id)) throw new Error(`Duplicate processed Prompt entry: ${contribution.id}`)
    const entry: ExtensionPromptEntry = {
      id: contribution.id,
      ...contribution.sourceRef,
      kind,
      label: node?.displayName ?? contribution.id,
      sourceLabel: nodes.get(contribution.sourceRef.sourceId)?.displayName,
      ...(node?.metadata ? { metadata: structuredClone(node.metadata) } : {}),
      content: contribution.content,
    }
    entries.set(entry.id, { processorId, entry })
    const group = groups.get(processorId) ?? []
    group.push(entry)
    groups.set(processorId, group)
  }
  const sessions = new Map<string, ExtensionPromptProcessingSession>()
  const executions: PromptProcessingExecution[] = []
  const signal = processing.context.signal
  const replaceContent = (id: string, content: string) => {
    const selected = entries.get(id)!
    selected.entry.content = content
    const contribution = model.contributions.find(item => item.id === id)!
    contribution.content = content
    const node = nodes.get(contribution.sourceRef.sourceNodeId)
    if (!contribution.capabilities.targetAnchorId && node?.body !== undefined) node.body = content
  }
  try {
    for (const [processorId, group] of groups) {
      signal.throwIfAborted()
      const session = await processing.registry.create(processorId, processing.context)
      sessions.set(processorId, session)
      if (!session.prepare) continue
      const patches = await session.prepare(structuredClone(group))
      signal.throwIfAborted()
      if (!Array.isArray(patches)) throw new Error(`Invalid Prompt preparation result: ${processorId}`)
      for (const patch of patches) {
        if (!patch || entries.get(patch.id)?.processorId !== processorId
          || (patch.content !== undefined && typeof patch.content !== 'string')
          || (patch.active !== undefined && typeof patch.active !== 'boolean'))
          throw new Error(`Invalid Prompt preparation patch: ${processorId}`)
        if (patch.content !== undefined) replaceContent(patch.id, patch.content)
        if (patch.active !== undefined) {
          const contribution = model.contributions.find(item => item.id === patch.id)!
          contribution.capabilities.activation = { kind: patch.active ? 'always' : 'manual' }
          const node = nodes.get(contribution.sourceRef.sourceNodeId)
          if (!contribution.capabilities.targetAnchorId && node) {
            node.capabilities = { ...node.capabilities, activation: contribution.capabilities.activation }
          }
        }
      }
      executions.push({ processorId, stage: 'prepare' })
    }
    const blocks = planPromptBlocks(model)
    const rendered = new Map<string, string>()
    for (const fragment of blocks.flat()) {
      const selected = entries.get(fragment.id)
      if (!selected) continue
      signal.throwIfAborted()
      let content = rendered.get(fragment.id)
      if (content === undefined) {
        content = await sessions.get(selected.processorId)!.render(structuredClone(selected.entry))
        signal.throwIfAborted()
        if (typeof content !== 'string') throw new Error(`Prompt processor must return text: ${selected.processorId}`)
        if (processing.renderText) content = processing.renderText(content)
        rendered.set(fragment.id, content)
        replaceContent(fragment.id, content)
        executions.push({ processorId: selected.processorId, stage: 'render', entryId: fragment.id })
      }
      fragment.content = content
    }
    signal.throwIfAborted()
    return { projection: emitPromptBlocks(blocks), model, executions }
  } finally {
    await Promise.all([...sessions.values()].map(session => session.dispose?.()))
  }
}

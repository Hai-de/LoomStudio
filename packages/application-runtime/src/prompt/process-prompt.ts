import type {
  ExtensionPromptEntry,
  ExtensionPromptProcessingContext,
  ExtensionPromptProcessingSession,
} from '@loom-studio/extension-sdk'
import type { PromptProcessorRegistry } from './prompt-processor-registry.js'
import { emitPromptBlocks, planPromptBlocks, type PromptDataModel } from './prompt-build-pipeline.js'
import type { CompiledPrompt, PromptContribution, SourceNode } from './prompt-builder.js'

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
  const entries = new Map<string, ProcessedEntry>()
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
    entries.set(entry.id, { processorId, entry, contribution, node })
    const group = groups.get(processorId) ?? []
    group.push(entry)
    groups.set(processorId, group)
  }
  const sessions = new Map<string, ExtensionPromptProcessingSession>()
  const executions: PromptProcessingExecution[] = []
  const signal = processing.context.signal
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
        applyProcessedEntryPatch(entries.get(patch.id)!, patch)
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
        applyProcessedEntryPatch(selected, { content })
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

type ProcessedEntry = {
  processorId: string
  entry: ExtensionPromptEntry
  contribution: PromptContribution
  node?: SourceNode
}

/**
 * The processor entry supplies each accepted update. Contributions retain it for
 * snapshots/tools; inline skeleton nodes mirror it for planning and compilation.
 * Authored input remains untouched in the caller's model (the build uses a clone).
 */
function applyProcessedEntryPatch(
  { entry, contribution, node }: ProcessedEntry,
  patch: { content?: string; active?: boolean },
): void {
  const inline = !contribution.capabilities.targetAnchorId
  if (patch.content !== undefined) {
    entry.content = patch.content
    contribution.content = patch.content
    if (inline && node?.body !== undefined) node.body = patch.content
  }
  if (patch.active !== undefined) {
    contribution.capabilities.activation = { kind: patch.active ? 'always' : 'manual' }
    if (inline && node) {
      node.capabilities = { ...node.capabilities, activation: contribution.capabilities.activation }
    }
  }
}

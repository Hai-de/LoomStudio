import { AsyncLocalStorage } from 'node:async_hooks'
import type { ApplicationRuntimeContext } from '../foundation/application-context.js'
import type { TimelineExtensionLease } from '../types.js'
import { assertTimelineExtensionLease } from './timeline-participation.js'
import { requireDocumentParticipant } from '../runtime/context.js'

const dependencies = new AsyncLocalStorage<{
  available: Map<string, TimelineExtensionLease>
  used: Map<string, TimelineExtensionLease>
}>()

export function registerPromptExtensionLease(lease: TimelineExtensionLease): void {
  const current = dependencies.getStore()
  if (current && !current.available.has(lease.installationId)) current.available.set(lease.installationId, lease)
}

export function recordPromptExtensionDependency(installationId: string, execution?: TimelineExtensionLease): void {
  if (execution) registerPromptExtensionLease(execution)
  const current = dependencies.getStore()
  const lease = current?.available.get(installationId)
  if (!current || !lease) return
  if (execution && (execution.generation !== lease.generation || execution.installationVersion !== lease.installationVersion
    || execution.timelineId !== lease.timelineId)) {
    throw new Error('Timeline extension changed during Prompt preparation')
  }
  current.used.set(installationId, lease)
}

export async function collectPromptExtensionDependencies<T>(
  ctx: Pick<ApplicationRuntimeContext, 'documents' | 'narratives' | 'dataEngine'>,
  work: () => Promise<T>,
): Promise<T & { promptExtensionLeases: TimelineExtensionLease[] }> {
  const current = { available: new Map<string, TimelineExtensionLease>(), used: new Map<string, TimelineExtensionLease>() }
  return dependencies.run(current, () => ctx.dataEngine.withTransactionGuard(async tx => {
    if (!current.used.size) return
    await requireDocumentParticipant(ctx).participateTransaction(tx, async documents => {
      for (const lease of current.used.values()) {
        await assertTimelineExtensionLease({ narratives: ctx.narratives?.transaction(tx) }, documents, lease)
      }
    }, { allowEmpty: true })
  }, async () => {
    const value = await work()
    const promptExtensionLeases = [...dependencies.getStore()!.used.values()]
    for (const lease of promptExtensionLeases) await assertTimelineExtensionLease(ctx, ctx.documents, lease)
    return { ...value, promptExtensionLeases }
  }))
}

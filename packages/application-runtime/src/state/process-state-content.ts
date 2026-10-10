import type { ApplicationRuntimeContext } from '../foundation/application-context.js'
import { readTimelineRuntimeContext } from '../narrative/timeline-runtime-context.js'
import { getApplicationStateSnapshot, type ApplicationStateContext } from './state.js'
import type { ApplyStateMutationInput, TimelineExtensionLease } from '../types.js'
import { captureTimelineExtensionLease, readTimelineExtensionParticipation } from '../extensions/timeline-participation.js'
import { readAvailableExtensionInstallations } from '../runtime/extension-resource-access.js'

export async function prepareStateContent(
  ctx: ApplicationStateContext & Pick<ApplicationRuntimeContext, 'stateContent'>,
  input: {
    text: string; operationId: string; signal: AbortSignal
    target?: { timelineId: string; branchId: string }
  },
): Promise<{ mutation?: ApplyStateMutationInput; diagnostics: string[]; extensionLeases: TimelineExtensionLease[] }> {
  if (!input.target) return { diagnostics: [], extensionLeases: [] }
  const context = await readTimelineRuntimeContext(ctx, input.target.timelineId)
  if (!context?.stateContributionSources.length) return { diagnostics: [], extensionLeases: [] }
  const config = await readTimelineExtensionParticipation(ctx.documents, input.target.timelineId)
  const adoptions = new Set(config.entries.map(entry => entry.installationId))
  const available = await readAvailableExtensionInstallations(ctx.documents, context.sourceCardId, input.target.timelineId)
  const sources = context.stateContributionSources.filter(source => !adoptions.has(source.installationId) || available.has(source.installationId))
  if (!sources.length) return { diagnostics: [], extensionLeases: [] }
  const leases = new Map<string, TimelineExtensionLease>()
  for (const source of sources) {
    if (adoptions.has(source.installationId) && !leases.has(source.installationId)) {
      leases.set(source.installationId, await captureTimelineExtensionLease(ctx, input.target.timelineId, source.installationId))
    }
  }
  const target = { scope: 'timeline' as const, ...input.target }
  const snapshot = await getApplicationStateSnapshot(ctx, target)
  const result = await ctx.stateContent.process({
    text: input.text, value: snapshot.value, contributionIds: sources.map(source => source.contributionId), target,
    cardId: context?.sourceCardId, signal: input.signal,
  })
  return {
    diagnostics: result.diagnostics,
    extensionLeases: [...leases.values()].filter(lease => sources.some(source =>
      source.installationId === lease.installationId && result.contributionIds.includes(source.contributionId))),
    ...(result.operations.length ? { mutation: {
      target, expectedRevisionId: snapshot.revisionId, operations: result.operations,
      idempotencyKey: input.operationId,
    } } : {}),
  }
}

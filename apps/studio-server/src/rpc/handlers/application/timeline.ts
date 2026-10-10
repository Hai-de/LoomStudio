import type {
  ApplicationRuntime,
  RuntimeRequestContext,
} from '@loom-studio/application-runtime'
import type { JsonValue } from '@loom-studio/shared'
import {
  isRecord,
  readNullableString,
  readBoolean,
  readOptionalBoolean,
  readNumber,
  readOptionalNumber,
  readOptionalString,
  readString,
} from '../../rpc-params.js'

export async function handleTimelineRpc(
  runtime: ApplicationRuntime,
  method: string,
  params: JsonValue | undefined,
  context?: RuntimeRequestContext,
): Promise<JsonValue | undefined> {
  switch (method) {
    case 'application.previewTimelineExtensionStateInitialization':
      return await runtime.previewTimelineExtensionStateInitialization({
        timelineId: readString(params, 'timelineId'),
        branchId: readString(params, 'branchId'),
        installationId: readString(params, 'installationId'),
      }) as unknown as JsonValue
    case 'application.initializeTimelineExtensionState':
      return await runtime.initializeTimelineExtensionState({
        timelineId: readString(params, 'timelineId'),
        branchId: readString(params, 'branchId'),
        installationId: readString(params, 'installationId'),
        expectedVersion: readNumber(params, 'expectedVersion'),
        expectedInstallationVersion: readNumber(params, 'expectedInstallationVersion'),
        expectedStateRevisionId: readString(params, 'expectedStateRevisionId'),
        expectedRuntimeContextVersion: readNumber(params, 'expectedRuntimeContextVersion'),
        contributionInstances: readContributionInstances(params),
      }, context) as unknown as JsonValue
    case 'application.previewTimelineExtensionAdoption':
      return await runtime.previewTimelineExtensionAdoption({
        timelineId: readString(params, 'timelineId'),
        branchId: readString(params, 'branchId'),
        installationId: readString(params, 'installationId'),
      }) as unknown as JsonValue
    case 'application.adoptTimelineExtension':
      return await runtime.adoptTimelineExtension({
        timelineId: readString(params, 'timelineId'),
        branchId: readString(params, 'branchId'),
        installationId: readString(params, 'installationId'),
        expectedVersion: readNumber(params, 'expectedVersion'),
        expectedInstallationVersion: readNumber(params, 'expectedInstallationVersion'),
        expectedStateRevisionId: readString(params, 'expectedStateRevisionId'),
        expectedRuntimeContextVersion: readNumber(params, 'expectedRuntimeContextVersion'),
        contributionInstances: readContributionInstances(params),
      }, context) as unknown as JsonValue
    case 'application.previewTimelineExtensionRecovery':
      return await runtime.previewTimelineExtensionRecovery({
        timelineId: readString(params, 'timelineId'),
        installationId: readString(params, 'installationId'),
      }) as unknown as JsonValue
    case 'application.recoverTimelineExtension':
      return await runtime.recoverTimelineExtension({
        timelineId: readString(params, 'timelineId'),
        installationId: readString(params, 'installationId'),
        expectedVersion: readNumber(params, 'expectedVersion'),
        expectedInstallationVersion: readNumber(params, 'expectedInstallationVersion'),
        acceptSourceChange: readOptionalBoolean(params, 'acceptSourceChange'),
      }, context) as unknown as JsonValue
    case 'application.inspectTimelineExtensionResources':
      return await runtime.inspectTimelineExtensionResources({
        timelineId: readString(params, 'timelineId'),
        installationId: readString(params, 'installationId'),
      }) as unknown as JsonValue
    case 'application.getTimelineExtensionParticipation':
      return await runtime.getTimelineExtensionParticipation({
        timelineId: readString(params, 'timelineId'),
      }) as unknown as JsonValue
    case 'application.updateTimelineExtensionParticipation':
      return await runtime.updateTimelineExtensionParticipation({
        timelineId: readString(params, 'timelineId'),
        installationId: readString(params, 'installationId'),
        expectedVersion: readNumber(params, 'expectedVersion'),
        enabled: readBoolean(params, 'enabled'),
      }, context) as unknown as JsonValue
    case 'application.appendNarrativeInput':
      return await runtime.appendNarrativeInput({
        timelineId: readString(params, 'timelineId'),
        branchId: readString(params, 'branchId'),
        nodeId: readString(params, 'nodeId'),
        expectedHeadNodeId: readNullableString(params, 'expectedHeadNodeId'),
        content: readString(params, 'content'),
      }, context) as unknown as JsonValue
    case 'application.editNarrativeNode':
      return await runtime.editNarrativeNode({
        timelineId: readString(params, 'timelineId'),
        branchId: readString(params, 'branchId'),
        nodeId: readString(params, 'nodeId'),
        expectedHeadNodeId: readString(params, 'expectedHeadNodeId'),
        expectedRaw: readString(params, 'expectedRaw'),
        raw: readString(params, 'raw'),
      }, context) as unknown as JsonValue
    case 'application.createNarrativeTimeline':
      return await runtime.createNarrativeTimeline({
        cardId: readString(params, 'cardId'),
        expectedCardVersion: readOptionalNumber(params, 'expectedCardVersion'),
        title: readOptionalString(params, 'title'),
        openingIndex: readOptionalNumber(params, 'openingIndex'),
        openingNodes: readOpeningNodes(params),
      }, context) as unknown as JsonValue

    case 'application.getNarrativeTimeline':
      return await runtime.getNarrativeTimeline({
        timelineId: readString(params, 'timelineId'),
      }) as unknown as JsonValue

    case 'application.exportTimelineArchive':
      return await runtime.exportTimelineArchive({ timelineId: readString(params, 'timelineId') }) as unknown as JsonValue

    case 'application.importTimelineArchive':
      return await runtime.importTimelineArchive({ source: readString(params, 'source') }) as unknown as JsonValue

    case 'application.listNarrativeTimelines':
      return await runtime.listNarrativeTimelines({
        createdFromCardId: readOptionalString(params, 'createdFromCardId'),
        cursor: readOptionalString(params, 'cursor'),
        limit: readOptionalNumber(params, 'limit'),
      }) as unknown as JsonValue

    case 'application.getNarrativePage':
      return await runtime.getNarrativePage({
        timelineId: readString(params, 'timelineId'),
        branchId: readOptionalString(params, 'branchId'),
        cursor: readOptionalString(params, 'cursor'),
        limit: readOptionalNumber(params, 'limit'),
      }) as unknown as JsonValue

    case 'application.getEffectiveNarrativePreview':
      return await runtime.getEffectiveNarrativePreview({
        timelineId: readString(params, 'timelineId'),
        branchId: readString(params, 'branchId'),
      }) as unknown as JsonValue

    case 'application.forkNarrativeBranch':
      return await runtime.forkNarrativeBranch({
        timelineId: readString(params, 'timelineId'),
        fromBranchId: readString(params, 'fromBranchId'),
        fromNodeId: readString(params, 'fromNodeId'),
        title: readOptionalString(params, 'title'),
      }, context) as unknown as JsonValue

    case 'application.switchNarrativeBranch':
      return await runtime.switchNarrativeBranch({
        timelineId: readString(params, 'timelineId'),
        branchId: readString(params, 'branchId'),
        expectedActiveBranchId: readOptionalString(params, 'expectedActiveBranchId'),
      }, context) as unknown as JsonValue

    case 'application.deleteNarrativeTimeline':
      return await runtime.deleteNarrativeTimeline({
        timelineId: readString(params, 'timelineId'),
      }, context) as unknown as JsonValue

    case 'application.updateNarrativeTimeline':
      return await runtime.updateNarrativeTimeline({
        timelineId: readString(params, 'timelineId'),
        title: readOptionalString(params, 'title'),
      }, context) as unknown as JsonValue

    default:
      return undefined
  }
}

function readContributionInstances(params: JsonValue | undefined): Array<{ contributionId: string; instanceId: string }> {
  if (!isRecord(params) || !Array.isArray(params.contributionInstances)) throw new Error('Expected contributionInstances array')
  return params.contributionInstances.map(item => ({
    contributionId: readString(item, 'contributionId'), instanceId: readString(item, 'instanceId'),
  }))
}

function readOpeningNodes(params: JsonValue | undefined): Array<{ content: string; createdAt?: string }> | undefined {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return undefined
  const value = (params as Record<string, unknown>).openingNodes
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error('Expected openingNodes array')
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Expected opening node object')
    const content = (item as Record<string, unknown>).content
    if (typeof content !== 'string') throw new Error('Expected opening node content')
    const createdAt = (item as Record<string, unknown>).createdAt
    if (createdAt !== undefined && typeof createdAt !== 'string') throw new Error('Expected opening node createdAt string')
    return { content, ...(createdAt !== undefined ? { createdAt } : {}) }
  })
}

import type {
  ApplicationRuntime
} from '@loom-studio/application-runtime'
import type { JsonValue } from '@loom-studio/shared'
import {
  isRecord,
  readBoolean,
  readNullableString,
  readNumber,
  readOptionalBoolean,
  readOptionalNumber,
  readOptionalString,
  readString,
} from '../../rpc-params.js'
import { jsonInput, procedure } from '../context.js'

export const timelineProcedures = {
  'previewTimelineExtensionStateInitialization': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['previewTimelineExtensionStateInitialization']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readString(params, 'branchId'),
      installationId: readString(params, 'installationId'),
    }
  })).query(({ ctx, input }) => ctx.runtime.previewTimelineExtensionStateInitialization(input)),
  'initializeTimelineExtensionState': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['initializeTimelineExtensionState']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readString(params, 'branchId'),
      installationId: readString(params, 'installationId'),
      expectedVersion: readNumber(params, 'expectedVersion'),
      expectedInstallationVersion: readNumber(params, 'expectedInstallationVersion'),
      expectedStateRevisionId: readString(params, 'expectedStateRevisionId'),
      expectedRuntimeContextVersion: readNumber(params, 'expectedRuntimeContextVersion'),
      contributionInstances: readContributionInstances(params),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.initializeTimelineExtensionState(input, ctx.request)),
  'previewTimelineExtensionAdoption': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['previewTimelineExtensionAdoption']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readString(params, 'branchId'),
      installationId: readString(params, 'installationId'),
    }
  })).query(({ ctx, input }) => ctx.runtime.previewTimelineExtensionAdoption(input)),
  'adoptTimelineExtension': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['adoptTimelineExtension']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readString(params, 'branchId'),
      installationId: readString(params, 'installationId'),
      expectedVersion: readNumber(params, 'expectedVersion'),
      expectedInstallationVersion: readNumber(params, 'expectedInstallationVersion'),
      expectedStateRevisionId: readString(params, 'expectedStateRevisionId'),
      expectedRuntimeContextVersion: readNumber(params, 'expectedRuntimeContextVersion'),
      contributionInstances: readContributionInstances(params),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.adoptTimelineExtension(input, ctx.request)),
  'previewTimelineExtensionRecovery': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['previewTimelineExtensionRecovery']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      installationId: readString(params, 'installationId'),
    }
  })).query(({ ctx, input }) => ctx.runtime.previewTimelineExtensionRecovery(input)),
  'recoverTimelineExtension': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['recoverTimelineExtension']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      installationId: readString(params, 'installationId'),
      expectedVersion: readNumber(params, 'expectedVersion'),
      expectedInstallationVersion: readNumber(params, 'expectedInstallationVersion'),
      acceptSourceChange: readOptionalBoolean(params, 'acceptSourceChange'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.recoverTimelineExtension(input, ctx.request)),
  'inspectTimelineExtensionResources': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['inspectTimelineExtensionResources']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      installationId: readString(params, 'installationId'),
    }
  })).query(({ ctx, input }) => ctx.runtime.inspectTimelineExtensionResources(input)),
  'getTimelineExtensionParticipation': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['getTimelineExtensionParticipation']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
    }
  })).query(({ ctx, input }) => ctx.runtime.getTimelineExtensionParticipation(input)),
  'updateTimelineExtensionParticipation': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['updateTimelineExtensionParticipation']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      installationId: readString(params, 'installationId'),
      expectedVersion: readNumber(params, 'expectedVersion'),
      enabled: readBoolean(params, 'enabled'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.updateTimelineExtensionParticipation(input, ctx.request)),
  'appendNarrativeInput': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['appendNarrativeInput']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readString(params, 'branchId'),
      nodeId: readString(params, 'nodeId'),
      expectedHeadNodeId: readNullableString(params, 'expectedHeadNodeId'),
      content: readString(params, 'content'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.appendNarrativeInput(input, ctx.request)),
  'editNarrativeNode': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['editNarrativeNode']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readString(params, 'branchId'),
      nodeId: readString(params, 'nodeId'),
      expectedHeadNodeId: readString(params, 'expectedHeadNodeId'),
      expectedRaw: readString(params, 'expectedRaw'),
      raw: readString(params, 'raw'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.editNarrativeNode(input, ctx.request)),
  'createNarrativeTimeline': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['createNarrativeTimeline']>[0] => {
    return {
      cardId: readString(params, 'cardId'),
      expectedCardVersion: readOptionalNumber(params, 'expectedCardVersion'),
      title: readOptionalString(params, 'title'),
      openingIndex: readOptionalNumber(params, 'openingIndex'),
      openingNodes: readOpeningNodes(params),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.createNarrativeTimeline(input, ctx.request)),
  'getNarrativeTimeline': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['getNarrativeTimeline']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
    }
  })).query(({ ctx, input }) => ctx.runtime.getNarrativeTimeline(input)),
  'exportTimelineArchive': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['exportTimelineArchive']>[0] => {
    return { timelineId: readString(params, 'timelineId') }
  })).query(({ ctx, input }) => ctx.runtime.exportTimelineArchive(input)),
  'importTimelineArchive': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['importTimelineArchive']>[0] => {
    return { source: readString(params, 'source') }
  })).mutation(({ ctx, input }) => ctx.runtime.importTimelineArchive(input)),
  'listNarrativeTimelines': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['listNarrativeTimelines']>[0] => {
    return {
      createdFromCardId: readOptionalString(params, 'createdFromCardId'),
      cursor: readOptionalString(params, 'cursor'),
      limit: readOptionalNumber(params, 'limit'),
    }
  })).query(({ ctx, input }) => ctx.runtime.listNarrativeTimelines(input)),
  'getNarrativePage': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['getNarrativePage']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readOptionalString(params, 'branchId'),
      cursor: readOptionalString(params, 'cursor'),
      limit: readOptionalNumber(params, 'limit'),
    }
  })).query(({ ctx, input }) => ctx.runtime.getNarrativePage(input)),
  'getEffectiveNarrativePreview': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['getEffectiveNarrativePreview']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readString(params, 'branchId'),
    }
  })).query(({ ctx, input }) => ctx.runtime.getEffectiveNarrativePreview(input)),
  'forkNarrativeBranch': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['forkNarrativeBranch']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      fromBranchId: readString(params, 'fromBranchId'),
      fromNodeId: readString(params, 'fromNodeId'),
      title: readOptionalString(params, 'title'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.forkNarrativeBranch(input, ctx.request)),
  'switchNarrativeBranch': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['switchNarrativeBranch']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readString(params, 'branchId'),
      expectedActiveBranchId: readOptionalString(params, 'expectedActiveBranchId'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.switchNarrativeBranch(input, ctx.request)),
  'deleteNarrativeTimeline': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['deleteNarrativeTimeline']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.deleteNarrativeTimeline(input, ctx.request)),
  'updateNarrativeTimeline': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['updateNarrativeTimeline']>[0] => {
    return {
      timelineId: readString(params, 'timelineId'),
      title: readOptionalString(params, 'title'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.updateNarrativeTimeline(input, ctx.request)),
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

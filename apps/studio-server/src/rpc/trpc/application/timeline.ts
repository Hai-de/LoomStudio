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
  'importNarrativeHistory': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['importNarrativeHistory']>[0] => {
    if (!isRecord(params) || !Array.isArray(params.messages)) throw new Error('Expected history messages array')
    return {
      cardId: readString(params, 'cardId'), title: readOptionalString(params, 'title'),
      messages: params.messages.map(message => {
        const createdAt = readOptionalString(message, 'createdAt')
        if (createdAt !== undefined && !Number.isFinite(Date.parse(createdAt))) throw new Error('Invalid history message timestamp')
        return { content: readString(message, 'content'), ...(createdAt !== undefined ? { createdAt } : {}) }
      }),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.importNarrativeHistory(input, ctx.request)),
  'replaceNarrativeOpening': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['replaceNarrativeOpening']>[0] => ({
    timelineId: readString(params, 'timelineId'),
    branchId: readString(params, 'branchId'),
    expectedHeadNodeId: readNullableString(params, 'expectedHeadNodeId'),
    expectedCardVersion: readOptionalNumber(params, 'expectedCardVersion'),
    openingId: readOptionalString(params, 'openingId'),
    openingContent: readOptionalString(params, 'openingContent'),
  }))).mutation(({ ctx, input }) => ctx.runtime.replaceNarrativeOpening(input, ctx.request)),
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
      openingId: readOptionalString(params, 'openingId'),
      openingContent: readOptionalString(params, 'openingContent'),
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
  'getNarrativeSwipes': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['getNarrativeSwipes']>[0] => ({
    timelineId: readString(params, 'timelineId'),
    branchId: readString(params, 'branchId'),
  }))).query(({ ctx, input }) => ctx.runtime.getNarrativeSwipes(input)),
  'selectNarrativeSwipe': procedure.input(jsonInput((params: JsonValue | undefined): Parameters<ApplicationRuntime['selectNarrativeSwipe']>[0] => {
    const expectedRevision = readNumber(params, 'expectedRevision')
    if (!Number.isInteger(expectedRevision)) throw new Error('Expected integer param: expectedRevision')
    if (!isRecord(params) || params.expectedHeadNodeId === undefined) throw new Error('Expected nullable string param: expectedHeadNodeId')
    return {
      timelineId: readString(params, 'timelineId'),
      branchId: readString(params, 'branchId'),
      groupId: readString(params, 'groupId'),
      candidateId: readString(params, 'candidateId'),
      expectedRevision,
      expectedHeadNodeId: readNullableString(params, 'expectedHeadNodeId'),
    }
  })).mutation(({ ctx, input }) => ctx.runtime.selectNarrativeSwipe(input, ctx.request)),
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

import { createApplicationRuntimeContext, type ApplicationRuntimeContext } from '../foundation/application-context.js'
import { applicationDocumentTypes } from '../foundation/document-types.js'
import { initializeGlobalState } from '../state/state.js'
import { obsoleteBuiltinAgentToolIds } from '../prompt/prompt-resource-defaults.js'
import { isDeepStrictEqual } from 'node:util'
import { officialAgentToolDefinitions } from '../agents/official-tools/index.js'
import type {
  AgentToolContent,
  ApplicationRuntime,
  ApplicationRuntimeOptions,
} from '../types.js'
import { applicationActor } from './context.js'
import { createCardsRuntimeMethods } from './cards-runtime.js'
import { createCardDirectoryRuntimeMethods } from './card-directory-sync.js'
import { createNarrativeRuntimeMethods } from './narrative-runtime.js'
import {
  createAgentsRuntimeMethods,
  refreshAgentToolRegistry,
  toAgentToolContent,
} from './agents-runtime.js'
import { createPromptRuntimeMethods } from './prompt-runtime.js'
import { createSearchRuntimeMethods } from './search-runtime.js'
import { createStateRuntimeMethods } from './state-runtime.js'
import { createTransformsRuntimeMethods } from './transforms-runtime.js'
import {
  createProvidersRuntimeMethods,
  initializeOfficialFakeProviderProfiles,
} from './providers-runtime.js'
import { createExtensionsRuntimeMethods } from './extensions-runtime.js'
import { createLoomScriptsRuntimeMethods } from './loom-scripts-runtime.js'
import { createOfficialContentRuntimeMethods } from './official-content-runtime.js'
import { createMacroConfigurationRuntimeMethods } from './macros-runtime.js'
import { buildExtensionPrompt } from '../prompt/extension-prompt.js'
import { readAvailableExtensionInstallations } from './extension-resource-access.js'
import { extensionInstallationId } from '@loom-studio/extension-sdk'
import { assertTimelineExtensionLease, beginTimelineExtensionWork, createTimelineExtensionParticipationMethods, runTimelineExtensionWork } from '../extensions/timeline-participation.js'
import { inspectTimelineExtensionResources } from '../extensions/resource-inspection.js'
import { createTimelineExtensionRecoveryMethods } from '../extensions/timeline-recovery.js'
import { createTimelineExtensionAdoptionMethods } from '../extensions/timeline-adoption.js'
import { createTimelineExtensionStateInitializationMethods } from '../extensions/timeline-state-initialization.js'

export function createApplicationRuntime(options: ApplicationRuntimeOptions): ApplicationRuntime {
  const ctx: ApplicationRuntimeContext = createApplicationRuntimeContext(options)

  return {
    initialize: async () => {
      await initializeGlobalState(ctx)
      await initializeOfficialFakeProviderProfiles(ctx)
      const timestamp = ctx.now()
      for (const toolId of obsoleteBuiltinAgentToolIds) {
        const document = await ctx.documents.get(toolId)
        if (!document) continue
        await ctx.documents.delete({
          id: toolId,
          expectedVersion: document.version,
          actor: applicationActor,
          reason: 'application.removeObsoleteBuiltinAgentTools',
        })
      }
      for (const definition of ctx.agentTools.list().map(tool =>
        officialAgentToolDefinitions.find(official => official.id === tool.id) ?? tool
      )) {
        const existing = await ctx.documents.get(definition.id)
        if (existing) {
          const content = existing.content as AgentToolContent
          if (definition.owner.namespace === 'official' && content.owner.namespace === 'official'
            && !content.origin && !isDeepStrictEqual({
              owner: content.owner, name: content.name, description: content.description,
              input: content.input, ...(content.prompt ? { prompt: content.prompt } : {}),
            }, definition)) {
            await ctx.documents.write({
              id: definition.id,
              type: applicationDocumentTypes.agentTool,
              content: toAgentToolContent(definition, content.createdAt, timestamp),
              expectedVersion: existing.version,
              actor: applicationActor,
              reason: 'application.initializePromptResources',
            })
          }
          continue
        }
        await ctx.documents.write({
          id: definition.id,
          type: applicationDocumentTypes.agentTool,
          content: toAgentToolContent(definition, timestamp),
          expectedVersion: 'new',
          actor: applicationActor,
          reason: 'application.initializePromptResources',
        })
      }
      await refreshAgentToolRegistry(ctx)
    },

    ...createCardsRuntimeMethods(ctx),
    ...createCardDirectoryRuntimeMethods(ctx),
    ...createNarrativeRuntimeMethods(ctx),
    ...createAgentsRuntimeMethods(ctx),
    buildExtensionPrompt: async (input, target, packageId, lease) => {
      if (lease) {
        if (lease.installationId !== extensionInstallationId(packageId, target)) throw new Error('Prompt execution belongs to another installation')
        await assertTimelineExtensionLease(ctx, ctx.documents, lease)
      }
      const timeline = lease ? await ctx.narratives?.getTimeline(lease.timelineId) : undefined
      const cardId = timeline?.createdFrom?.cardId ?? (target.kind === 'card' ? target.cardId : undefined)
      const messages = (await buildExtensionPrompt({
        build: input,
        promptResources: ctx.promptResources,
        installations: await readAvailableExtensionInstallations(ctx.documents, cardId, lease?.timelineId),
        owner: { installationId: extensionInstallationId(packageId, target), packageId },
        processors: ctx.promptProcessors,
        ...(cardId ? { cardId } : {}),
      })).messages
      if (lease) await assertTimelineExtensionLease(ctx, ctx.documents, lease)
      return { messages }
    },
    ...createMacroConfigurationRuntimeMethods(ctx),
    ...createPromptRuntimeMethods(ctx),
    ...createSearchRuntimeMethods(ctx),
    ...createStateRuntimeMethods(ctx),
    ...createTransformsRuntimeMethods(ctx),
    ...createProvidersRuntimeMethods(ctx),
    ...createExtensionsRuntimeMethods(ctx),
    ...createTimelineExtensionParticipationMethods(ctx),
    ...createTimelineExtensionRecoveryMethods(ctx),
    ...createTimelineExtensionAdoptionMethods(ctx),
    ...createTimelineExtensionStateInitializationMethods(ctx),
    runTimelineExtensionWork: (input, work) => runTimelineExtensionWork(ctx, input, work),
    beginTimelineExtensionWork: input => beginTimelineExtensionWork(ctx, input),
    inspectTimelineExtensionResources: input => inspectTimelineExtensionResources(ctx, input),
    assertTimelineExtensionWork: lease => assertTimelineExtensionLease(ctx, ctx.documents, lease),
    ...createLoomScriptsRuntimeMethods(ctx),
    ...createOfficialContentRuntimeMethods(ctx),
  }
}

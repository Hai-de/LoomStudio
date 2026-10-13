import { agentsProcedures } from './application/agents.js'
import { cardsProcedures } from './application/cards.js'
import { extensionRecordsProcedures } from './application/extension-records.js'
import { loomScriptsProcedures } from './application/loom-scripts.js'
import { portablePayloadsProcedures } from './application/portable-payloads.js'
import { providersProcedures } from './application/providers.js'
import { statesProcedures } from './application/states.js'
import { textTransformsProcedures } from './application/text-transforms.js'
import { timelineProcedures } from './application/timeline.js'
import { workspacesProcedures } from './application/workspaces.js'
import { t } from './context.js'
import { extensionsRouter, kernelRouter, platformRouters } from './kernel.js'
import { aiRouter, directoriesRouter, logsRouter, officialRouter, settingsRouter } from './services.js'

export const studioTrpcRouter = t.router({
  ...platformRouters,
  extensions: extensionsRouter, kernel: kernelRouter,
  official: officialRouter, settings: settingsRouter, logs: logsRouter, directories: directoriesRouter, ai: aiRouter,
  application: t.router({
    ...agentsProcedures,
    ...loomScriptsProcedures,
    ...cardsProcedures,
    ...extensionRecordsProcedures,
    ...portablePayloadsProcedures,
    ...providersProcedures,
    ...statesProcedures,
    ...textTransformsProcedures,
    ...timelineProcedures,
    ...workspacesProcedures,
  }),
})
export type AppRouter = typeof studioTrpcRouter

export type { NetworkProxyMode } from '../../platform/network-settings.js'

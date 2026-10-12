import { createExtensionApplicationAdapter } from './extensions/extension-application-adapter.js'
import { createCardTransferService } from './codecs/card-transfer-service.js'
import {
  applicationDocumentTypes,
  extensionInstallationId,
  createApplicationRuntime,
  createDocumentBackedAiGateway,
  createDocumentBackedProfiledAiGateway,
  createOfficialAgentToolRegistry,
  createMacroProviderRegistry,
  createPromptProcessorRegistry,
  createStateContentRegistry,
  createNarrativeContextRegistry,
  createStateContributionRegistry,
  type ExtensionInstallationContent,
} from '@loom-studio/application-runtime'
import { canAccessExtensionAsset } from './extensions/extension-asset-access.js'
import { createExtensionFileData } from './extensions/extension-file-data.js'
import {
  createAiGatewayCapabilityRegistry,
  createOfficialProviderAdapterRegistry,
  registerOfficialFakeAiProvider,
} from '@loom-studio/ai-gateway'
import { createAgentStore } from '@loom-studio/application-data'
import { createAssetStore, type AssetStore } from '@loom-studio/asset-store'
import { createBlobStore } from '@loom-studio/blob-store'
import { createSqliteDataEngine, type SqliteDataEngine } from '@loom-studio/data-engine'
import { createInMemoryDiagnosticsRegistry } from '@loom-studio/diagnostics'
import { createSqliteDocumentStore, type DocumentStore } from '@loom-studio/document-store'
import { createExtensionHost } from '@loom-studio/extension-host'
import { createKernel } from '@loom-studio/kernel'
import { queryExtensionLogs, readLogFailure, type Logger, type LogReader, type LogHistoryReader } from '@loom-studio/logging'
import { createNarrativeStore } from '@loom-studio/application-data'
import { createPromptResourceStore, migrateLoreDocuments, type PromptResourceStore } from '@loom-studio/application-data'
import { createKeyringSecretBackend, createSecretStore, type SecretBackend } from '@loom-studio/secret-store'
import { createLoomRunner } from '@loom-studio/loom-runner'
import { createId, nowIso, type JsonValue } from '@loom-studio/shared'
import { createStateStore } from '@loom-studio/application-data'
import { createInMemoryTraceAuditStore } from '@loom-studio/trace-audit'
import { join, resolve } from 'node:path'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { withAiGatewayLogging } from './logging/ai-gateway-logging.js'
import { createNetworkSettingsStore } from './platform/network-settings.js'
import { resolveSystemProxyUrl } from './platform/system-proxy.js'
import { createApplicationSessionAuth } from './http/application-session-auth.js'
import { withDocumentStoreLogging } from './logging/document-store-logging.js'
import { createStudioHttpServer } from './http/http-server.js'
import { createStudioRpcRouter } from './rpc/studio-rpc-router.js'
import { createServerExtensionManager } from './extensions/extension-manager.js'
import { createExtensionStateStore } from './extensions/extension-state-store.js'
import { createExtensionImportConversions } from './extensions/import-conversion.js'
import { createOfficialContentService, installBuiltinStarterContent } from './official/official-content.js'
import { createCardDirectoryService } from './resource-directories/card-directory.js'
import { createCardDirectoryCatalog } from './resource-directories/card-directory-catalog.js'
import { createCardDirectoryImporter } from './resource-directories/card-directory-import.js'
import { createCardDirectoryMedia } from './resource-directories/card-directory-media.js'
import { readString } from './rpc/rpc-params.js'
import { resolveLoomStudioLocalPaths, type LoomStudioLocalPaths } from './platform/local-paths.js'

const defaultPort = 18010
const defaultClientOrigin = process.env.STUDIO_CLIENT_URL ?? 'http://127.0.0.1:18011'
const installationRoot = fileURLToPath(new URL('../../../', import.meta.url))

export type StudioServer = {
  listen(port?: number): Promise<{ port: number }>
  close(): Promise<void>
}

export type CreateStudioServerOptions = {
  localPaths?: LoomStudioLocalPaths
  documents?: DocumentStore
  sqlitePath?: string
  logger?: Logger
  logs?: LogReader
  logHistory?: LogHistoryReader
  rpcLogger?: Logger
  documentLogger?: Logger
  promptBuildLogger?: Logger
  runtimeLogger?: Logger
  providerLogger?: Logger
  extensionLogger?: Logger
  extensionRootDirectory?: string
  extensionInstalledDirectory?: string
  extensionStateDirectory?: string
  officialContentDirectory?: string
  secretBackend?: SecretBackend
  applicationSessionOrigins?: string[]
  runtimeMode?: 'development' | 'production'
  clientDirectory?: string
}

export function createStudioServer(options: CreateStudioServerOptions = {}): StudioServer {
  const officialContentDirectory = options.officialContentDirectory ?? join(installationRoot, 'official/starter')
  const localPaths = options.localPaths ?? resolveLoomStudioLocalPaths({ home: '.loomstudio-dev' })
  const logger = options.logger
  const diagnostics = createInMemoryDiagnosticsRegistry()
  let dataEngine: SqliteDataEngine | undefined
  let rawDocuments: DocumentStore
  if (options.documents) {
    rawDocuments = options.documents
  } else {
    dataEngine = createSqliteDataEngine({ filename: options.sqlitePath ?? localPaths.databaseFile, createId, now: nowIso })
    try {
      rawDocuments = createSqliteDocumentStore({ engine: dataEngine })
    } catch (error) {
      void dataEngine.close()
      throw error
    }
  }
  const documents = options.documentLogger ? withDocumentStoreLogging(rawDocuments, options.documentLogger) : rawDocuments
  const networkSettings = createNetworkSettingsStore({
    filename: join(localPaths.configRoot, 'network.json'),
    resolveSystemProxyUrl,
  })
  const secrets = dataEngine ? createSecretStore({
    engine: dataEngine,
    backend: options.secretBackend ?? createKeyringSecretBackend(),
    createId,
    now: nowIso,
    authorizeUse: (_metadata, context) => context.caller === 'application.ai-gateway',
    onCleanupFailure: () => {
      diagnostics.add({
        severity: 'warning',
        source: 'secret-store',
        code: 'secret.cleanup_pending',
        message: 'Credential cleanup is incomplete; its durable record is retained for retry.',
      })
      logger?.warn('Credential cleanup is incomplete; queued for retry', {
        event: 'secret.cleanup_pending',
      })
    },
  }) : undefined
  const traceAudit = createInMemoryTraceAuditStore()
  const loomRunner = createLoomRunner({ traceAudit })
  const aiCapabilities = createAiGatewayCapabilityRegistry()
  const macroProviders = createMacroProviderRegistry()
  const promptProcessors = createPromptProcessorRegistry()
  const stateContent = createStateContentRegistry()
  const narrativeContext = createNarrativeContextRegistry()
  const stateContributions = createStateContributionRegistry()
  registerOfficialFakeAiProvider(aiCapabilities)
  const providerAdapters = createOfficialProviderAdapterRegistry({ aiCapabilities })
  const profiledAiGateway = createDocumentBackedProfiledAiGateway({
    documents,
    registry: aiCapabilities,
    secrets,
  })
  const gateway = createDocumentBackedAiGateway({
    documents,
    secrets,
    resolveProxyUrl: networkSettings.resolveProxyUrl,
    providerAdapters,
  })
  let agents
  let narratives
  let states
  let blobs: ReturnType<typeof createBlobStore> | undefined
  let assets: AssetStore | undefined
  let promptResources: PromptResourceStore | undefined
  try {
    if (dataEngine) {
      const version = dataEngine.database.prepare('SELECT version FROM schema_migrations WHERE namespace = ?')
        .get('application.prompt-resource') as { version: number } | undefined
      if (version && version.version < 6 && (options.sqlitePath ?? localPaths.databaseFile) !== ':memory:') {
        mkdirSync(localPaths.backupRoot, { recursive: true })
        const backupPath = join(localPaths.backupRoot, `before-lore-${Date.now()}.sqlite`)
        dataEngine.database.prepare('VACUUM INTO ?').run(backupPath)
      }
    }
    promptResources = dataEngine ? createPromptResourceStore({ engine: dataEngine, createId, now: nowIso }) : undefined
    agents = dataEngine ? createAgentStore({ engine: dataEngine, createId, now: nowIso }) : undefined
    narratives = dataEngine ? createNarrativeStore({ engine: dataEngine, createId, now: nowIso }) : undefined
    states = dataEngine ? createStateStore({ engine: dataEngine, createId, now: nowIso }) : undefined
    if (dataEngine) {
      dataEngine.migrate({ namespace: 'application.lore-documents', migrations: [{ version: 1, migrate: migrateLoreDocuments }] })
      blobs = createBlobStore({
        engine: dataEngine,
        rootDirectory: localPaths.blobRoot,
        createId,
        now: nowIso,
      })
      assets = createAssetStore({ engine: dataEngine, blobs, createId, now: nowIso })
    }
  } catch (error) {
    void dataEngine?.close()
    throw error
  }
  if (!dataEngine || !promptResources) {
    throw new Error('Studio Server requires a shared SQLite Data Engine and Prompt Resource Store')
  }
  const agentTools = createOfficialAgentToolRegistry()
  const applicationRuntime = createApplicationRuntime({
    onStateChanged: event => kernel.getEventBus().emit('state.changed', event, { publisher: { kind: 'kernel' }, source: 'application-state' }),
    withCardDeletion: (id, commit) => {
      if (!resourceDirectories) throw new Error('Card directory service is unavailable')
      return extensionManager.withCardDeletions([id], () => resourceDirectories!.deleteCard(id, commit))
    },
    withCardDeletions: (ids, commit) => {
      if (!resourceDirectories) throw new Error('Card directory service is unavailable')
      return extensionManager.withCardDeletions(ids, () => resourceDirectories!.deleteCards(ids, commit))
    },
    agents,
    agentTools,
    dataEngine,
    documents,
    blobs,
    narratives,
    promptResources,
    states,
    sourceArtifacts: assets
      ? {
        preserve: async input => {
          const result = await assets.preserveSourceArtifact(input)
          const blob = await assets.blobs.get(result.artifact.blobId)
          if (!blob) throw new Error(`Preserved source Blob not found: ${result.artifact.blobId}`)
          return {
            sourceArtifactId: result.artifact.id,
            blobId: blob.id,
            sha256: blob.sha256,
            sizeBytes: blob.sizeBytes,
            originalFileName: result.artifact.originalFileName,
            mediaType: result.artifact.mediaType,
          }
        },
      }
      : undefined,
    mediaAssets: assets ? { get: assetId => assets.getMediaAsset(assetId) } : undefined,
    secrets,
    providerAdapters,
    aiCapabilities,
    macroProviders,
    promptProcessors,
    stateContent,
    narrativeContext,
    stateContributions,
    gateway: options.providerLogger ? withAiGatewayLogging(gateway, options.providerLogger) : gateway,
    logger: options.promptBuildLogger,
    runtimeLogger: options.runtimeLogger,
  })
  const extensionFileData = createExtensionFileData(localPaths.dataRoot, documents)
  const extensionHost = createExtensionHost({
    resolveFileDataDirectory: extensionFileData.directory,
    serverModuleSnapshotRoot: join(options.extensionInstalledDirectory ?? join(installationRoot, 'extensions'), '.runtime'),
    documents,
    diagnostics,
    logger: options.extensionLogger,
    queryLogs: (packageId, input, installationId) => queryExtensionLogs({ current: options.logs, history: options.logHistory }, packageId, input, 'server', installationId),
    mode: options.runtimeMode ?? 'development',
    grantEventCapabilities: (manifest, moduleManifest, target) => extensionManager.getGrantedEventCapabilities(manifest.id, moduleManifest.id, target),
    grantAssetCapabilities: (manifest, moduleManifest, target) => extensionManager.getGrantedAssetCapabilities(manifest.id, moduleManifest.id, target),
    assetScratchRoot: localPaths.extensionCacheRoot,
    canAccessAsset: (asset, target) => canAccessExtensionAsset(documents, asset, target),
    ...createExtensionApplicationAdapter({
      applicationRuntime, assets, documents, agents, narratives, states, promptResources,
      getKernel: () => kernel,
      aiCapabilities, profiledAiGateway, gateway, agentTools, macroProviders, promptProcessors,
      stateContent, narrativeContext, stateContributions,
    }),
  })
  const extensionRootDirectory = options.extensionRootDirectory
  const extensionStateDirectory = resolve(options.extensionStateDirectory ?? localPaths.extensionRoot)
  const extensionManager = createServerExtensionManager({
    host: extensionHost,
    diagnostics,
    stateStore: createExtensionStateStore({
      filename: options.extensionStateDirectory ? join(extensionStateDirectory, 'state.json') : localPaths.extensionStateFile,
      now: nowIso,
    }),
    repositoryDirectory: extensionRootDirectory,
    installedDirectory: options.extensionInstalledDirectory ?? join(installationRoot, 'extensions'),
    devLinksFile: options.extensionStateDirectory ? join(extensionStateDirectory, 'dev-links.json') : localPaths.extensionDevLinksFile,
    deleteData: extensionFileData.removeGlobal,
    officialSetupFile: join(localPaths.configRoot, 'official-extension-setup.json'),
    bundledDirectories: options.runtimeMode === 'production' && !options.extensionInstalledDirectory
      ? [join(installationRoot, 'official/extensions/loom-assistant')] : [],
    readCardPackage: input => applicationRuntime.getCardExtensionPackage(input),
    listInstallations: () => applicationRuntime.listExtensionInstallations(),
    importPackageResources: input => applicationRuntime.importExtensionPackageResources(input, {
      actor: { kind: 'extension', id: input.packageId },
    }) as Promise<Record<string, JsonValue>>,
    removePackageResources: input => applicationRuntime.removeExtensionPackageResources(input, {
      actor: { kind: 'extension', id: input.packageId },
    }) as Promise<Record<string, JsonValue>>,
  })
  const kernel = createKernel({
    documents,
    dataCommits: dataEngine ?? documents,
    diagnostics,
    traceAudit,
    extensionHost,
    extensionManager,
    loomRunner,
  })
  const importConversions = createExtensionImportConversions(kernel)
  kernel.getEventBus().registerDefinition({
    name: 'directories.media.changed', owner: { kind: 'kernel' }, version: 1,
    visibility: 'public', stability: 'experimental', summary: 'Card directory media changed',
  })
  const directoryCatalog = createCardDirectoryCatalog({
    dataRoot: localPaths.dataRoot,
    listCardIds: async () => {
      const ids: string[] = []
      let cursor: string | undefined
      do {
        const page = await applicationRuntime.listCards({ cursor, limit: 100 })
        ids.push(...page.cards.map(card => card.id))
        cursor = page.nextCursor
      } while (cursor)
      return ids
    },
  })
  const startupDirectoryScan = directoryCatalog.scan()
  const directoryMedia = createCardDirectoryMedia({ dataRoot: localPaths.dataRoot })
  let mediaWatcher: { dispose(): void } | undefined
  const resourceDirectories = assets ? createCardDirectoryService({
    dataRoot: localPaths.dataRoot,
    readCard: cardId => cardTransfer.readCardExport(cardId),
    applyCard: async (cardId, artifact, snapshot, context) => { await applicationRuntime.applyCardDirectoryState({ cardId, artifact, snapshot }, context) },
  }) : undefined
  const cardExists = async (id: string) => {
    const document = await documents.get(id)
    return Boolean(document && !document.meta.tombstone)
  }
  const saveImportedCard = async (id: string) => {
    if (!resourceDirectories) throw new Error('Card directory service unavailable')
    await resourceDirectories.recoverCard(id)
    const preview = await resourceDirectories.previewCard(id)
    await resourceDirectories.saveCard(id, preview.token)
  }
  const directoryImporter = createCardDirectoryImporter({
    dataRoot: localPaths.dataRoot,
    cardExists,
    isRegistered: async directory => {
      const catalog = await directoryCatalog.scan()
      if (catalog.error) throw new Error(catalog.error)
      const entry = catalog.entries.find(entry => entry.directory === directory)
      if (entry?.error) throw new Error(entry.error)
      return Boolean(entry?.registeredCardId)
    },
    importCard: async (bundle, id, clientId) => { await cardTransfer.importCardArchive(bundle, clientId, id) },
    normalizeCard: saveImportedCard,
  })
  const rpcRouter = createStudioRpcRouter({
    convertPromptResource: importConversions.promptResource,
    applicationRuntime,
    officialContent: createOfficialContentService(applicationRuntime, resolve(officialContentDirectory)),
    resourceDirectories: {
      call: async (method, params, context) => {
        if (method === 'directories.import') {
          const result = await directoryImporter.importDirectory(readString(params, 'directory'), readString(params, 'token'), context.clientId)
          await directoryCatalog.scan()
          return result
        }
        if (method === 'directories.list') await startupDirectoryScan
        if (['directories.list', 'directories.scan', 'directories.open', 'directories.attachment'].includes(method)) return directoryCatalog.call(method, params)
        if (!resourceDirectories) throw new Error('Card directory saving requires the Asset Store')
        return resourceDirectories.call(method, params, context)
      },
    },
    aiCapabilities,
    aiGateway: profiledAiGateway,
    kernel,
    logs: options.logs,
    logHistory: options.logHistory,
    networkSettings,
    emitEvent: (name, payload, context) => {
      kernel.getEventBus().emit(name, payload, {
        publisher: { kind: 'kernel' },
        source: 'studio-server',
        ...context,
      })
    },
  })
  const cardTransfer = createCardTransferService({ applicationRuntime, assets, directoryMedia, importConversions, saveImportedCard })
  const server = createStudioHttpServer({
    auth: createApplicationSessionAuth({
      allowedOrigins: options.applicationSessionOrigins ?? (options.runtimeMode === 'production' ? [] : [defaultClientOrigin]),
    }),
    clientDirectory: options.clientDirectory,
    assets,
    canReadCardExtensionAsset: async input => {
      const target = { kind: 'card' as const, cardId: input.cardId }
      const installationId = extensionInstallationId(input.packageId, target)
      const [installation, asset, card] = await Promise.all([
        documents.get(installationId), assets?.getMediaAsset(input.assetId), documents.get(input.cardId),
      ])
      if (!asset || !installation || installation.type !== applicationDocumentTypes.extensionInstallation
        || !card || card.type !== applicationDocumentTypes.cardSource) return false
      const content = installation.content as ExtensionInstallationContent
      if (content.packageId !== input.packageId || content.target.kind !== 'card' || content.target.cardId !== input.cardId) return false
      if (asset.ownerPackageId === input.packageId && asset.ownerInstallationId === installationId) return true
      return extensionManager.getGrantedAssetCapabilities(input.packageId, input.moduleId, target).includes('assets.read')
        && await canAccessExtensionAsset(documents, asset, target)
    },
    cardMedia: cardTransfer.cardMedia,
    cardPng: cardTransfer.cardPng,
    extensionIcons: {
      read: (packageId, version) => extensionManager.readPackageIcon(packageId, version),
    },
    extensionFiles: {
      read: (packageId, version, path, installation) => installation
        ? extensionManager.readCardPackageFile(installation.cardId, packageId, version, installation.archiveDigest, path)
        : extensionManager.readPackageFile(packageId, version, path),
    },
    extensionEvents: {
      subscribe: handler => {
        const eventBus = kernel.getEventBus()
        const delivery = eventBus.subscribe(['extensions.changed', 'extensions.data.changed', 'entity.lifecycle.changed', 'directories.media.changed', 'data.changed'], handler)
        const data = eventBus.subscribe(['data.changed'], event => {
          const changesetId = event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
            && typeof event.payload.changesetId === 'string'
            ? event.payload.changesetId
            : undefined
          eventBus.emit('extensions.data.changed', changesetId ? { changesetId } : {}, { publisher: { kind: 'kernel' } })
        })
        return {
          dispose: () => {
            delivery.dispose()
            data.dispose()
          },
        }
      },
    },
    logger: options.rpcLogger,
    rpcRouter,
  })

  return {
    listen: async (port = defaultPort) => {
      logger?.info('Studio server starting', {
        event: 'server.starting',
        data: { requestedPort: port },
      })
      try {
        await secrets?.retryPendingCleanup({ actor: { kind: 'system', id: 'studio-server' }, reason: 'server.start.secret-cleanup' })
        await startupDirectoryScan
        await resourceDirectories?.recoverDeletions(async id => {
          const document = await documents.get(id)
          return Boolean(document && !document.meta.tombstone)
        })
        const recoveryErrors = [
          ...await directoryImporter.recoverImports(),
          ...await resourceDirectories!.recoverApplies(),
        ]
        for (const failure of recoveryErrors) console.error(`Card ${failure.cardId} directory recovery requires attention: ${failure.error}`)
        await directoryCatalog.scan()
        await applicationRuntime.initialize()
        await installBuiltinStarterContent(applicationRuntime, resolve(officialContentDirectory))
        await kernel.start()
        await extensionManager.initialize()
        mediaWatcher = await directoryMedia.watch(() => {
          kernel.getEventBus().emit('directories.media.changed', {}, { publisher: { kind: 'kernel' }, source: 'studio-server' })
        })
        await new Promise<void>((resolve, reject) => {
          const handleError = (error: Error) => reject(error)
          server.once('error', handleError)
          server.listen(port, '127.0.0.1', () => {
            server.off('error', handleError)
            resolve()
          })
        })
        const address = server.address()
        const actualPort = typeof address === 'object' && address ? address.port : port
        logger?.info('Studio server started', {
          event: 'server.started',
          data: { host: '127.0.0.1', port: actualPort, detail: `http://127.0.0.1:${actualPort}` },
        })
        return { port: actualPort }
      } catch (error) {
        mediaWatcher?.dispose()
        mediaWatcher = undefined
        logger?.error('Studio server failed to start', {
          event: 'server.start.failed',
          data: { requestedPort: port, ...readLogFailure(error), detail: readLogFailure(error).failureReason },
        })
        throw error
      }
    },
    close: async () => {
      logger?.info('Studio server stopping', { event: 'server.stopping' })
      mediaWatcher?.dispose()
      mediaWatcher = undefined
      await server.shutdown()
      try {
        await kernel.stop()
      } finally {
        try {
          await secrets?.retryPendingCleanup({ actor: { kind: 'system', id: 'studio-server' }, reason: 'server.stop.secret-cleanup' })
        } finally {
          await dataEngine?.close()
        }
      }
      logger?.info('Studio server stopped', { event: 'server.stopped' })
    },
  }
}

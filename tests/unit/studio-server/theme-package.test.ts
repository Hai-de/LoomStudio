import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInMemoryDiagnosticsRegistry } from '@loom-studio/diagnostics'
import { createInMemoryDocumentStore } from '@loom-studio/document-store'
import { createExtensionHost } from '@loom-studio/extension-host'
import { expect, it } from 'vitest'
import { createServerExtensionManager } from '../../../apps/studio-server/src/extensions/extension-manager.js'
import { createExtensionStateStore } from '../../../apps/studio-server/src/extensions/extension-state-store.js'

it('installs the official theme package and serves its CSS and relative SVG assets without enabling JS', async () => {
  const root = await mkdtemp(join(tmpdir(), 'loom-theme-package-'))
  const source = fileURLToPath(new URL('../../../official/extensions/loom-theme-paper/', import.meta.url))
  const diagnostics = createInMemoryDiagnosticsRegistry()
  const host = createExtensionHost({
    documents: createInMemoryDocumentStore(), diagnostics,
    callRpc: async () => null,
    registerRpc: () => { throw new Error('A newly installed theme must not register server RPC') },
  })
  try {
    const manager = createServerExtensionManager({
      host, diagnostics,
      stateStore: createExtensionStateStore({ filename: join(root, 'state.json'), now: () => '2026-10-17T00:00:00.000Z' }),
      repositoryDirectory: join(root, 'empty-repository'),
      installedDirectory: join(root, 'installed'),
      devLinksFile: join(root, 'dev-links.json'),
      readCardPackage: async () => { throw new Error('No Card package in this fixture') },
      listInstallations: async () => ({ installations: [] }),
      importPackageResources: async () => ({ installationId: 'fixture', promptResources: [], agentTools: [], transformRules: [], textExtractors: [] }),
      removePackageResources: async ({ packageId }) => ({ packageId, promptResourceIds: [], agentToolIds: [], textTransformRuleIds: [], textExtractorIds: [], detachedReferences: { cards: 0, timelines: 0, presetToolMounts: 0 } }),
    })
    await manager.initialize()
    expect(manager.listPackages()).toEqual([])
    const installed = await manager.installPackage(source)
    const catalog = manager.listPackages()
    expect(catalog).toHaveLength(1)
    expect(catalog[0].resources?.themes).toEqual(installed.resources?.themes)
    expect(catalog[0].resources?.themes).toEqual([expect.objectContaining({ id: 'paper', css: './paper.css' })])
    expect(catalog[0].resources?.styles).toEqual([expect.objectContaining({ id: 'smooth-motion', css: './motion.css', moduleId: 'motion', supportsCssOnly: true })])
    expect(catalog[0].modules).toEqual([expect.objectContaining({ moduleId: 'motion', runtimeKind: 'client', desired: expect.objectContaining({ enabled: false }) })])

    const revision = installed.fileRevision ?? installed.version
    for (const path of ['./paper.css', './motion.css', './assets/paper-texture.png', './assets/settings.svg']) {
      const served = await manager.readPackageFile(installed.packageId, revision, path)
      const original = await readFile(join(source, path))
      expect(Buffer.from(served.bytes)).toEqual(original)
      expect(served.mediaType).toBe(path.endsWith('.css') ? 'text/css; charset=utf-8' : path.endsWith('.png') ? 'image/png' : 'image/svg+xml')
      expect(await readFile(join(root, 'installed', installed.packageId, path))).toEqual(original)
    }
    const css = await manager.readPackageFile(installed.packageId, revision, './paper.css')
    expect(Buffer.from(css.bytes).toString('utf8')).toContain("url('./assets/paper-texture.png')")
    expect(Buffer.from(css.bytes).toString('utf8')).toContain("url('./assets/settings.svg')")
  } finally {
    await host.disposeAll()
    await rm(root, { recursive: true, force: true })
  }
})

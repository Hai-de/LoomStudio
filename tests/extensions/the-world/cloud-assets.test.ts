import { cp, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { createClouds3dFX } from '../../../extensions/the-world/src/client/clouds-3d.js'
import { authenticatedFetch, callRpc, withStudioServer } from '../../integration/studio-server/helpers.js'

const packageDirectory = fileURLToPath(new URL('../../../extensions/the-world/', import.meta.url))

describe('The World cloud asset', () => {
  it('uses the URL supplied by the package file capability', () => {
    const style = { textContent: '', remove: vi.fn() }
    vi.stubGlobal('document', { createElement: () => style, head: { append: vi.fn() } })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    try {
      const cloudUrl = '/extensions/official.the-world/0.1.4/files/assets/images/cloud.png?installation=card-1'
      const controller = createClouds3dFX({}, cloudUrl)
      expect(style.textContent).toContain(`url('${cloudUrl}')`)
      controller.dispose()
      expect(style.remove).toHaveBeenCalledOnce()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('serves the real cloud PNG and built client entry from an installed package', async () => {
    await withStudioServer(async (port, root) => {
      const sourceDirectory = join(root, 'the-world')
      await cp(packageDirectory, sourceDirectory, {
        recursive: true,
        filter: source => !['node_modules', '.git', '.DS_Store'].includes(basename(source)),
      })
      await callRpc(port, 'extensions.installPackage', { sourceDirectory })
      const resources = await callRpc<{ resources: Array<{ rootNode: { label: string }; origin?: { packageId: string } }> }>(
        port, 'application.listPromptResources', {},
      )
      expect(resources.resources.filter(resource => resource.origin?.packageId === 'official.the-world'))
        .toMatchObject([{ rootNode: { label: 'The World 世界状态维护规则' } }])
      const installed = await callRpc<{ installations: Array<{ packageId: string; target: { kind: string } }> }>(
        port, 'application.listExtensionInstallations', {},
      )
      expect(installed.installations).toEqual([expect.objectContaining({ packageId: 'official.the-world', target: { kind: 'global' } })])
      const catalog = await callRpc<{ items: Array<{ packageId: string; participation?: string }> }>(port, 'extensions.listPackages', {})
      expect(catalog.items.find(item => item.packageId === 'official.the-world')?.participation).toBe('timeline')
      const manifest = JSON.parse(await readFile(new URL('../../../extensions/the-world/manifest.json', import.meta.url), 'utf8'))
      const filesBase = `/extensions/${manifest.id}/${manifest.version}/files`
      const cloud = await authenticatedFetch(port, `${filesBase}/assets/images/cloud.png`)
      expect(cloud.status).toBe(200)
      expect(cloud.headers.get('content-type')).toBe('image/png')
      expect(Buffer.from(await cloud.arrayBuffer())).toEqual(await readFile(new URL('../../../extensions/the-world/assets/images/cloud.png', import.meta.url)))
      const entry = await authenticatedFetch(port, `${filesBase}/dist/client.js`)
      expect(entry.status).toBe(200)
      const javascript = await entry.text()
      expect(javascript).toContain('assets/images/cloud.png')
      expect(javascript).not.toContain('../../assets/images/cloud.png')
    })
  })
})

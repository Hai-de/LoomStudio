import { describe, expect, it } from 'vitest'
import { authenticatedFetch, callRpc, withStudioServer } from '../../integration/studio-server/helpers.js'

describe('tRPC wire contract', () => {
  it('preserves domain failure and tracing metadata without exposing stacks', async () => {
    await withStudioServer(async port => {
      const { resource } = await callRpc<{ resource: { id: string; version: number; rootNode: { id: string } } }>(port, 'application.createPromptResource', { resourceKind: 'lore', name: 'Test' })
      const input = { resourceId: resource.id, assetId: resource.rootNode.id, expectedVersion: resource.version, label: 'Updated' }
      await callRpc(port, 'application.updatePromptResourceAsset', input)
      const response = await authenticatedFetch(port, '/trpc/application.updatePromptResourceAsset', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-correlation-id': 'contract-correlation' }, body: JSON.stringify(input),
      })
      const payload = await response.json()
      expect(response.ok).toBe(false)
      expect(payload.error.data).toMatchObject({ domainCode: 'prompt_resource.conflict', correlationId: 'contract-correlation', callId: response.headers.get('x-call-id') })
      expect(payload.error.data.stack).toBeUndefined()
    })
  })

  it('does not allow the dynamic extension gateway to bypass static procedures', async () => {
    await withStudioServer(async port => {
      await expect(callRpc(port, 'kernel.invoke', { method: 'application.createCard', params: { name: 'Bypass' } })).rejects.toThrow('typed platform procedure')
      expect(await callRpc(port, 'application.listCards', {})).toMatchObject({ cards: [] })
      expect((await authenticatedFetch(port, '/rpc', { method: 'POST' })).status).toBe(404)
    })
  })
})

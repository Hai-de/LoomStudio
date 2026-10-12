import { describe, expect, it, vi } from 'vitest'
import type { ApplicationRuntime } from '@loom-studio/application-runtime'
import type { JsonObject } from '@loom-studio/shared'
import { handleWorkspacesRpc } from '../../../apps/studio-server/src/rpc/handlers/application/workspaces.js'

describe('Setting mount RPC input', () => {
  it('accepts mount identities and new resources as well as the legacy ID list', async () => {
    const replaceLoreMounts = vi.fn(async () => ({ mounts: [], mutation: { changesetId: 'change' } }))
    const runtime = { replaceLoreMounts } as unknown as ApplicationRuntime
    const source = { kind: 'preset', id: 'preset' }
    const input: JsonObject = { source, mounts: [{ id: 'missing-mount' }, { loreResourceId: 'new-setting' }] }
    await handleWorkspacesRpc(runtime, 'application.replaceLoreMounts', input)
    expect(replaceLoreMounts).toHaveBeenLastCalledWith(input, undefined)
    const legacy = { source, loreResourceIds: ['lore'] }
    await handleWorkspacesRpc(runtime, 'application.replaceLoreMounts', legacy)
    expect(replaceLoreMounts).toHaveBeenLastCalledWith(legacy, undefined)
    await handleWorkspacesRpc(runtime, 'application.replaceLoreMounts', { source, mounts: [] })
    expect(replaceLoreMounts).toHaveBeenLastCalledWith({ source, mounts: [] }, undefined)
  })

  it('rejects malformed or ambiguous lists before calling the runtime', async () => {
    const replaceLoreMounts = vi.fn()
    const runtime = { replaceLoreMounts } as unknown as ApplicationRuntime
    const source = { kind: 'preset', id: 'preset' }
    const invalidInputs: JsonObject[] = [
      { source },
      { source, mounts: [], loreResourceIds: [] },
      { source, mounts: [{ id: 1 }] },
    ]
    for (const params of invalidInputs) {
      await expect(handleWorkspacesRpc(runtime, 'application.replaceLoreMounts', params)).rejects.toThrow()
    }
    expect(replaceLoreMounts).not.toHaveBeenCalled()
  })
})

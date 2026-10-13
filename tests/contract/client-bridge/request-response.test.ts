import { createClientBridge } from '@loom-studio/client-bridge'
import { describe, expect, it } from 'vitest'

function createFetch(response: unknown): typeof fetch {
  return (async (_input: RequestInfo | URL, init?: RequestInit) => {
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

describe('client bridge request-response contract', () => {
  it('forwards cancellation to the HTTP request', async () => {
    const controller = new AbortController()
    const bridge = createClientBridge({
      endpoint: 'http://localhost/trpc',
      fetch: (async (_url, init) => {
        expect(init?.signal).toBe(controller.signal)
        return await new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal!.reason), { once: true }))
      }) as typeof fetch,
    })
    const request = bridge.call('logs.history', {}, { signal: controller.signal })
    controller.abort()
    await expect(request).rejects.toThrow()
  })
  it('sends tRPC requests and returns result payloads', async () => {
    const bridge = createClientBridge({
      endpoint: 'http://localhost/trpc',
      fetch: createFetch({
        result: { data: { ok: true } },
        meta: { clientId: 'test', correlationId: 'corr-1', callId: 'call-1' },
      }),
    })

    const result = await bridge.call('system.ping', { echo: 'hello' })

    expect(result).toEqual({ ok: true })
  })

  it('surfaces rpc error responses', async () => {
    const bridge = createClientBridge({
      endpoint: 'http://localhost/trpc',
      fetch: createFetch({
        error: { code: -32603, message: 'boom', data: { code: 'INTERNAL_SERVER_ERROR', httpStatus: 500 } },
        meta: { clientId: 'test', correlationId: 'corr-1', callId: 'call-1' },
      }),
    })

    await expect(bridge.call('system.bad')).rejects.toThrow('boom')
  })
})

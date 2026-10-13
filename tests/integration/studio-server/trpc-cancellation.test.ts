import type { ApplicationRuntime, RuntimeRequestContext } from '@loom-studio/application-runtime'
import { createMemoryLogSink, createRootLogger } from '@loom-studio/logging'
import { expect, it, vi } from 'vitest'
import { createStudioHttpServer } from '../../../apps/studio-server/src/http/http-server.js'
import { createApplicationSessionAuth } from '../../../apps/studio-server/src/http/application-session-auth.js'
import { authenticatedTrpc } from './trpc-helpers.js'

it('passes the authenticated request context to the Runtime and drains a disconnected mutation', async () => {
  const started = Promise.withResolvers<RuntimeRequestContext>()
  const cancelled = Promise.withResolvers<void>()
  // Runtime is the boundary under test here; real persistence is covered by the mount roundtrips.
  const runtime = { createLoomScriptMount: vi.fn(async (_input, context: RuntimeRequestContext) => {
    started.resolve(context)
    await new Promise<void>(resolve => context.abortSignal!.addEventListener('abort', () => resolve(), { once: true }))
    cancelled.resolve()
    context.abortSignal!.throwIfAborted()
  }) } as unknown as ApplicationRuntime
  const sink = createMemoryLogSink({ capacity: 20 })
  const logger = createRootLogger({ service: 'test', instanceId: 'pilot', sinks: [sink] }).child('http')
  const server = createStudioHttpServer({ auth: createApplicationSessionAuth(), applicationRuntime: runtime, logger })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing address')
  try {
    const client = await authenticatedTrpc(address.port)
    const abort = new AbortController()
    const pending = client.application.createLoomScriptMount.mutate({ target: { kind: 'workspace', workspaceId: 'pilot' }, scriptDocumentId: 'script', orderIndex: 0 }, { signal: abort.signal })
    const rejection = expect(pending).rejects.toThrow()
    const context = await started.promise
    expect(context).toMatchObject({ clientId: expect.any(String), correlationId: expect.any(String), callId: expect.any(String), abortSignal: expect.any(AbortSignal) })
    abort.abort()
    await rejection
    await cancelled.promise
    expect(context.abortSignal?.aborted).toBe(true)
  } finally {
    await server.shutdown()
    expect(sink.list()).toContainEqual(expect.objectContaining({ event: 'rpc.failed', callId: expect.any(String), correlationId: expect.any(String) }))
  }
})

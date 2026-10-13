import type { StudioRpcServices } from '../rpc/trpc/services-context.js'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import type { ApplicationRuntime } from '@loom-studio/application-runtime'
import { createId } from '@loom-studio/shared'
import { readLogFailure, type Logger } from '@loom-studio/logging'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ApplicationSession } from './application-session-auth.js'
import { maxRpcRequestBodyBytes, readRpcRequestBody, RpcRequestBodyTooLargeError } from './rpc-request-body.js'
import { studioTrpcRouter } from '../rpc/trpc/router.js'

// Buffer only bounded JSON requests before passing them to the tRPC adapter. This also
// makes disconnect/shutdown cancellation part of the server's request drain.
export async function handleTrpcRequest(
  request: IncomingMessage, response: ServerResponse, runtime: ApplicationRuntime,
  session: ApplicationSession, signal: AbortSignal, logger?: Logger, services?: StudioRpcServices,
): Promise<void> {
  const context = { clientId: session.clientId, correlationId: readContextHeader(request, 'x-correlation-id') ?? createId('corr'), parentCallId: readContextHeader(request, 'x-parent-call-id'), callId: createId('call'), abortSignal: signal }
  const startedAt = performance.now()
  response.setHeader('x-correlation-id', context.correlationId)
  response.setHeader('x-call-id', context.callId)
  response.setHeader('x-client-id', context.clientId)
  try {
    const body = await readRpcRequestBody(request, signal, maxRpcRequestBodyBytes)
    signal.throwIfAborted()
    const result = await fetchRequestHandler({
      endpoint: '/trpc',
      req: new Request(new URL(request.url!, 'http://localhost'), {
        method: 'POST', headers: { 'content-type': 'application/json' }, body, signal,
      }),
      router: studioTrpcRouter,
      allowBatching: false,
      allowMethodOverride: true,
      createContext: () => ({ runtime, request: context, logger, services, convertPromptResource: services?.convertPromptResource }),
      onError: ({ error, path }) => {
        const failure = readLogFailure(error)
        logger?.error(`${path ?? 'unknown'} failed · ${failure.failureReason}`, {
          event: 'rpc.failed', correlationId: context.correlationId, callId: context.callId,
          data: { method: path ?? 'unknown', transport: 'trpc', outcome: 'failure',
            durationMs: Math.round((performance.now() - startedAt) * 100) / 100, ...failure },
        })
      },
    })
    const bytes = Buffer.from(await result.arrayBuffer())
    signal.throwIfAborted()
    result.headers.forEach((value, name) => response.setHeader(name, value))
    response.writeHead(result.status)
    response.end(bytes)
  } catch (error) {
    if (signal.aborted) return
    logger?.error('tRPC request failed', { event: 'rpc.failed', correlationId: context.correlationId, callId: context.callId, data: readLogFailure(error) })
    if (!(error instanceof RpcRequestBodyTooLargeError)) throw error
    response.writeHead(413, { 'connection': 'close', 'content-type': 'application/json' })
    response.end(JSON.stringify({ error: { code: error.code, message: error.message } }))
  }
}

function readContextHeader(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name]
  return typeof value === 'string' && value.length > 0 && value.length <= 256 ? value : undefined
}

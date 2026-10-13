import type { ApplicationRuntime, RuntimeRequestContext } from '@loom-studio/application-runtime'
import type { Logger } from '@loom-studio/logging'
import type { JsonValue } from '@loom-studio/shared'
import { initTRPC } from '@trpc/server'
import { z } from 'zod'
import { isTechnicalRpc, summarizeRpc } from '../rpc-summary.js'
import type { StudioRpcServices } from './services-context.js'

export type StudioTrpcContext = {
  services?: StudioRpcServices
  runtime: ApplicationRuntime
  request: RuntimeRequestContext
  logger?: Logger
  convertPromptResource?: import('../../extensions/import-conversion.js').PromptResourceConverter
}

export const t = initTRPC.context<StudioTrpcContext>().create({
  errorFormatter({ shape, ctx, error }) {
    const cause = error.cause
    const domainCode = cause && 'code' in cause && typeof cause.code === 'string' ? cause.code : undefined
    return { ...shape, data: { ...shape.data, stack: undefined, domainCode, correlationId: ctx?.request.correlationId, callId: ctx?.request.callId } }
  },
})
export const procedure = t.procedure.use(async ({ ctx, path, next }) => {
  ctx.request.abortSignal?.throwIfAborted()
  const startedAt = performance.now()
  const result = await next()
  const method = path.includes('.') ? path : `application.${path}`
  const fields = {
    correlationId: ctx.request.correlationId,
    callId: ctx.request.callId,
    parentCallId: ctx.request.parentCallId,
  }
  const data = { method, transport: 'trpc', durationMs: Math.round((performance.now() - startedAt) * 100) / 100 }
  if (result.ok && !path.startsWith('logs.')) {
    const summary = summarizeRpc(method, result.data)
    ctx.logger?.info(summary.textSuffix ? `${method} · ${summary.textSuffix}` : `${method} completed`, {
      ...fields, event: 'rpc.completed',
      data: { ...data, outcome: 'success', technical: isTechnicalRpc(method), ...summary.summaryData },
    })
  }
  return result
})

// Adapt existing domain readers to tRPC's unknown input boundary; their return
// types define the client contract without a second handwritten method map.
const json = z.json().optional()
export function jsonInput<T>(parse: (params: JsonValue | undefined) => T): (input: unknown) => T {
  return input => parse(json.parse(input))
}

export const serviceProcedure = procedure.use(({ ctx, next }) => {
  if (!ctx.services) throw new Error('Studio services unavailable')
  return next({ ctx: { ...ctx, services: ctx.services } })
})

import type { LogQuery, LogReader } from '@loom-studio/logging'
import { describe, expect, it, vi } from 'vitest'
import { logsRouter } from '../../../apps/studio-server/src/rpc/trpc/services.js'
import type { StudioTrpcContext } from '../../../apps/studio-server/src/rpc/trpc/context.js'
function callLogsRpc(logs: LogReader, method: 'logs.list' | 'logs.history', params: unknown, logHistory?: import('@loom-studio/logging').LogHistoryReader, signal?: AbortSignal) {
  const caller = logsRouter.createCaller({ services: { logs, logHistory }, request: { abortSignal: signal } } as StudioTrpcContext)
  return Reflect.get(caller, method.slice(5))(params)
}

describe('logs.list RPC', () => {
  it('validates and forwards query parameters', async () => {
    const query = vi.fn<(input: LogQuery) => ReturnType<LogReader['query']>>(() => ({
      items: [],
      cursor: 'memory:test:0',
      hasMore: false,
    }))

    await callLogsRpc({ query }, 'logs.list', {
      limit: 25,
      levels: ['warn', 'error'],
      namespacePrefix: 'runtime.provider',
      since: '2026-07-22T08:00:00Z',
    })

    expect(query).toHaveBeenCalledWith(expect.objectContaining({
      limit: 25,
      levels: ['warn', 'error'],
      namespacePrefix: 'runtime.provider',
      since: '2026-07-22T08:00:00.000Z',
    }))
  })

  it('rejects unsafe limits and empty level filters', async () => {
    const logs: LogReader = {
      query: () => ({ items: [], cursor: 'memory:test:0', hasMore: false }),
    }

    await expect(callLogsRpc(logs, 'logs.list', { limit: 501 })).rejects.toThrow('between 1 and 500')
    await expect(callLogsRpc(logs, 'logs.list', { levels: [] })).rejects.toThrow('levels must contain')
  })
  it('passes a validated history range and cancellation without admitting file paths', async () => {
    const logs: LogReader = { query: () => ({ items: [], cursor: 'memory:test:0', hasMore: false }) }
    const query = vi.fn(async () => ({ items: [], cursor: 'history:test', hasMore: false, scannedBytes: 0, scannedRecords: 0, issues: [] }))
    const controller = new AbortController()
    await callLogsRpc(logs, 'logs.history', { since: '2026-09-22T00:00:00Z', until: '2026-09-22T12:00:00Z' }, { query }, controller.signal)
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ since: '2026-09-22T00:00:00.000Z', limit: 100 }), controller.signal)
    await expect(callLogsRpc(logs, 'logs.history', { since: '2026-09-22', path: '/etc/passwd' }, { query })).rejects.toThrow('Unknown')
  })
})

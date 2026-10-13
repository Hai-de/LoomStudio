import { createTRPCUntypedClient, httpLink } from '@trpc/client'
import { createSessionFetch } from './session-fetch.js'
export { createSessionFetch } from './session-fetch.js'

export type ClientJsonValue = null | boolean | number | string | ClientJsonValue[] | { [key: string]: ClientJsonValue }
export type ClientBridgeOptions = { endpoint: string; fetch?: typeof fetch }
export type ClientBridge = {
  call<T = ClientJsonValue>(method: string, params?: ClientJsonValue, options?: { signal?: AbortSignal }): Promise<T>
}

// Untyped bridge for dynamic extension/SDK consumers. Main application code
// uses AppRouter via createStudioTrpcClient and cannot nominate return types.
export function createClientBridge(options: ClientBridgeOptions): ClientBridge {
  const rawFetch = options.fetch ?? globalThis.fetch
  if (!rawFetch) throw new Error('ClientBridge requires fetch')
  const authEndpoint = `${options.endpoint.slice(0, options.endpoint.lastIndexOf('/'))}/auth/session`
  const client = createTRPCUntypedClient({ links: [httpLink({
    url: options.endpoint, methodOverride: 'POST', fetch: createSessionFetch(rawFetch, authEndpoint),
  })] })
  return { call: <T = ClientJsonValue>(method: string, params?: ClientJsonValue, requestOptions?: { signal?: AbortSignal }) => {
    const platform = ['application', 'official', 'directories', 'settings', 'logs', 'ai', 'system', 'docs', 'extensions', 'diagnostics', 'loom', 'trace', 'audit', 'kernel'].includes(method.split('.')[0]!)
    return client.mutation(platform ? method : 'kernel.invoke', platform ? params : { method, params }, requestOptions) as Promise<T>
  } }
}

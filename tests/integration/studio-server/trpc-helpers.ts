import { createStudioTrpcClient, type StudioTrpcClient } from '../../../apps/studio-client/src/shared/api/trpc-client.js'
import { createApplicationSession } from './helpers.js'

export async function authenticatedTrpc(port: number): Promise<StudioTrpcClient> {
  const cookie = await createApplicationSession(port)
  return createStudioTrpcClient({
    endpoint: `http://127.0.0.1:${port}/trpc`,
    fetch: (input, init) => fetch(input, { ...init, headers: { ...init?.headers, cookie } }),
  })
}

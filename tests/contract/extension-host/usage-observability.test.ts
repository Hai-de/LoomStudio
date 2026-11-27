import { describe, expect, it, vi } from 'vitest'
import { createExtensionFixture, createExtensionHostHarness } from './helpers.js'

describe('Extension usage and provider account observability', () => {
  it('delivers usage events and exposes only host-mediated Provider Profile contracts', async () => {
    const listProviderProfiles = vi.fn(async () => [{
      id: 'profile-1',
      displayName: 'Example Provider',
      providerExtensionId: 'official.openai-compatible',
      baseUrl: 'https://provider.example/v1',
      enabledModelIds: ['example-chat'],
      credentialConfigured: true,
    }])
    const getProviderJson = vi.fn(async () => ({
      providerProfileId: 'profile-1',
      status: 200,
      ok: true,
      body: { example: true },
    }))
    const { kernel, extensionHost } = createExtensionHostHarness({
      listProviderProfiles,
      getProviderJson,
      grantEventCapabilities: () => ['usage'],
    })
    const directory = createExtensionFixture('usage-observability', {
      manifest: {
        manifestVersion: 2,
        id: 'example.usage',
        version: '0.0.0',
        displayName: 'Usage Observability',
        engines: { studio: '^0.1.0' },
        modules: [{
          id: 'server',
          runtime: 'server',
          entry: './dist/index.js',
          capabilities: { 'events.subscribe': ['usage'], 'ai.profiles.read': true, 'ai.provider.read': true },
          contributes: { rpc: [{ name: 'example.usage.read' }] },
        }],
      },
      source: `const state = { profiles: [], providerResponse: null, usage: [] };
        export async function activate(ctx) {
          state.profiles = await ctx.ai.listProviderProfiles();
          state.providerResponse = await ctx.ai.getProviderJson({ providerProfileId: 'profile-1', path: '/status', auth: { kind: 'bearer' } });
          ctx.events.subscribe(['ai.usage.recorded'], event => { state.usage.push(event.payload) });
          ctx.rpc.register('example.usage.read', () => state);
        }`,
    })

    await extensionHost.discover(directory)
    await extensionHost.activate('example.usage', 'server')
    kernel.getEventBus().emit('ai.usage.recorded', {
      providerProfileId: 'profile-1',
      modelId: 'example-chat',
      outcome: 'completed',
      usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120, cacheReadTokens: 80 },
      durationMs: 42,
      providerCallId: 'provider-call-1',
      finishedAt: '2026-11-28T00:00:00.000Z',
    }, { publisher: { kind: 'kernel' }, source: 'test' })

    await expect(kernel.callRpc('example.usage.read')).resolves.toMatchObject({
      profiles: [{ id: 'profile-1', baseUrl: 'https://provider.example/v1' }],
      providerResponse: { status: 200, ok: true, body: { example: true } },
      usage: [{ modelId: 'example-chat', outcome: 'completed', usage: { cacheReadTokens: 80 } }],
    })
  })
})

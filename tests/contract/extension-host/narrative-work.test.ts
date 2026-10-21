import { expect, it } from 'vitest'
import { createExtensionFixture, createExtensionHostHarness } from './helpers.js'

it('requires Timeline scope and capability, then rechecks revoked leases after async reads', async () => {
  let active = true
  const harness = createExtensionHostHarness({
    runTimelineWork: async (input, work) => work({ lease: { ...input, installationVersion: 1, generation: 'g' }, signal: new AbortController().signal }),
    assertTimelineWork: async () => { if (!active) throw new Error('revoked') },
    readExtensionNarrative: async target => {
      active = false
      return { source: { ...target, throughNodeId: null, nodeIds: [], digest: 'empty' }, nodes: [], complete: true }
    },
  })
  for (const capability of [false, true]) {
    const id = capability ? 'example.reader' : 'example.denied'
    await harness.extensionHost.discover(createExtensionFixture(id, {
      manifest: { manifestVersion: 2, id, displayName: id, version: '1.0.0', participation: 'timeline', engines: { studio: '^0.1.0' },
        modules: [{ id: 'server', runtime: 'server', entry: './dist/index.js', capabilities: { 'narrative.read': capability },
          contributes: { rpc: [{ name: `${id}.read` }] } }] },
      source: `export function activate(ctx) {
        ctx.rpc.register('${id}.read', p => {
          const read = () => ctx.narrative.read({ selection: { kind: 'tail', count: 1 } });
          return p.managed ? ctx.timeline.run({ scope: 'timeline', timelineId: 't', branchId: 'b' }, read) : read();
        });
      }`,
    }))
    await harness.extensionHost.activate(id, 'server')
  }
  try {
    await expect(harness.kernel.callRpc('example.denied.read', { managed: true })).rejects.toThrow('narrative.read')
    await expect(harness.kernel.callRpc('example.reader.read', {})).rejects.toThrow('ctx.timeline.run')
    await expect(harness.kernel.callRpc('example.reader.read', { managed: true })).rejects.toThrow('revoked')
  } finally { await harness.extensionHost.disposeAll() }
})

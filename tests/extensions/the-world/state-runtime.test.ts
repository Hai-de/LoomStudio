import { describe, expect, it } from 'vitest'
import { createApplicationRuntime, createStateContributionRegistry } from '@loom-studio/application-runtime'
import { createNarrativeStore, createPromptResourceStore } from '@loom-studio/application-data'
import { createSqliteDataEngine } from '@loom-studio/data-engine'
import { createSqliteDocumentStore } from '@loom-studio/document-store'
import { createId, nowIso } from '@loom-studio/shared'
import { activate } from '../../../extensions/the-world/src/server/index.js'

function setup() {
  const engine = createSqliteDataEngine({ filename: ':memory:', createId, now: nowIso })
  const stateContributions = createStateContributionRegistry()
  const runtime = createApplicationRuntime({
    dataEngine: engine, documents: createSqliteDocumentStore({ engine }),
    narratives: createNarrativeStore({ engine }), promptResources: createPromptResourceStore({ engine }), stateContributions,
  })
  const tools = new Map<string, (...args: any[]) => Promise<any>>()
  const rpcs = new Map<string, (...args: any[]) => Promise<any>>()
  activate({
    state: {
      contribute(contribution: any) {
        stateContributions.register({
          target: { kind: 'global' }, packageId: 'official.the-world', packageVersion: '0.1.4',
          moduleId: 'server', instanceId: 'test', contribution,
        })
      },
      async read(target: any) { return (await runtime.getStateSnapshot({ target })).snapshot },
      async write(input: any) {
        const result = await runtime.applyStateMutation(input)
        return { snapshot: result.snapshot, changesetId: result.mutation.changesetId }
      },
    },
    rpc: { register(id: string, handler: (...args: any[]) => Promise<any>) { rpcs.set(id, handler) } },
    agentTools: { register(id: string, handler: (...args: any[]) => Promise<any>) { tools.set(id, handler) } },
  })
  const read = tools.get('official.the-world/read-world-state')!
  const write = tools.get('official.the-world/update-world-state')!
  const rpc = (name: string, args: any) => rpcs.get(`official.the-world.${name}`)!(args)
  const context = (target?: any, invocationId = createId('invocation')) => ({
    signal: new AbortController().signal, invocationId, ...(target ? { narrativeTarget: target } : {}),
  })
  const weather = (kind: string) => [{ op: 'add', path: '/entities/world/components/weather', value: { version: 1, kind } }]
  async function timeline() {
    const { card } = await runtime.createCard({ name: 'World', opening: { entries: [{ role: 'assistant', content: 'Arrival' }] } })
    await runtime.updateCard({ cardId: card.id, stateContributionIds: [stateContributions.list()[0]!.contributionId] })
    const story = await runtime.createNarrativeTimeline({ cardId: card.id })
    return { story, target: { scope: 'timeline' as const, timelineId: story.timeline.id, branchId: story.branch.id } }
  }
  return { engine, runtime, read, write, rpc, context, weather, timeline }
}

describe('The World handlers with real State Service', () => {
  it('rejects unbound or model-supplied targets and cancelled writes', async () => {
    const f = setup()
    try {
      const { target } = await f.timeline()
      await expect(f.read({ arguments: {} }, f.context())).rejects.toThrow('bound Narrative')
      await expect(f.read({ arguments: { branchId: target.branchId } }, f.context(target))).rejects.toThrow('supplied by the Host')
      const before = await f.read({ arguments: {} }, f.context(target))
      const abort = new AbortController()
      abort.abort()
      await expect(f.write({ arguments: { expectedRevisionId: before.revisionId, patch: f.weather('rain') } },
        { ...f.context(target), signal: abort.signal })).rejects.toThrow()
      expect((await f.read({ arguments: {} }, f.context(target))).revisionId).toBe(before.revisionId)
    } finally { f.engine.close() }
  })
  it('replays identical requests after subsequent writes without overwriting the head', async () => {
    const f = setup()
    try {
      const { target } = await f.timeline()
      const before = await f.read({ arguments: {} }, f.context(target))
      const args = { arguments: { expectedRevisionId: before.revisionId, patch: f.weather('rain') } }
      const invocation = f.context(target, 'same-call')
      const first = await f.write(args, invocation)
      const second = await f.write({ arguments: { expectedRevisionId: first.revisionId, patch: f.weather('snow') } }, f.context(target))
      expect(await f.write(args, invocation)).toEqual(first)
      expect((await f.read({ arguments: {} }, f.context(target))).revisionId).toBe(second.revisionId)
      await expect(f.write({ arguments: { ...args.arguments, patch: f.weather('fog') } }, invocation)).rejects.toThrow()
      await expect(f.write(args, f.context(target))).rejects.toMatchObject({ code: 'state.head_conflict' })
      expect((await f.read({ arguments: {} }, f.context(target))).state.theWorld.entities.world.components.weather.kind).toBe('snow')
    } finally { f.engine.close() }
  })
  it('forks without embedded branch identities and isolates subsequent writes', async () => {
    const f = setup()
    try {
      const { target, story } = await f.timeline()
      const fork = await f.runtime.forkNarrativeBranch({
        timelineId: target.timelineId, fromBranchId: target.branchId, fromNodeId: story.nodes[0]!.id, title: 'Fork',
      })
      const other = { ...target, branchId: fork.branch.id }
      const original = await f.read({ arguments: {} }, f.context(target))
      const forkRead = await f.read({ arguments: {} }, f.context(other))
      expect(forkRead.state).toEqual(original.state)
      await f.write({ arguments: { expectedRevisionId: forkRead.revisionId, patch: f.weather('rain') } }, f.context(other))
      expect((await f.read({ arguments: {} }, f.context(target))).state).toEqual(original.state)
      expect((await f.read({ arguments: {} }, f.context(other))).state.theWorld.entities.world.components.weather.kind).toBe('rain')
    } finally { f.engine.close() }
  })
  it('previews v1 without writes and commits only the reviewed revision and content', async () => {
    const f = setup()
    try {
      const { target } = await f.timeline()
      const before = await f.read({ arguments: {} }, f.context(target))
      const legacy = { schemaVersion: 1, branch: target, entities: {} }
      const installed = await f.runtime.applyStateMutation({
        target, expectedRevisionId: before.revisionId, operations: [{ op: 'set', path: '/theWorld', value: legacy }],
      })
      await expect(f.read({ arguments: {} }, f.context(target))).rejects.toThrow('explicitly upgrade')
      const preview = await f.rpc('previewWorldUpgrade', target)
      expect(preview.revisionId).toBe(installed.snapshot.revisionId)
      expect((await f.runtime.getStateSnapshot({ target })).snapshot.value).toEqual({ theWorld: legacy })
      const request = { ...target, expectedRevisionId: preview.revisionId, state: preview.state, idempotencyKey: 'upgrade' }
      await expect(f.rpc('commitWorldUpgrade', {
        ...request, state: { ...preview.state, extra: true },
      })).rejects.toThrow('preview does not match')
      const result = await f.rpc('commitWorldUpgrade', request)
      expect(await f.rpc('commitWorldUpgrade', request)).toEqual(result)
      expect((await f.read({ arguments: {} }, f.context(target))).state.theWorld.schemaVersion).toBe(2)
    } finally { f.engine.close() }
  })
})

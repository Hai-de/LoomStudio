import { createSqliteDataEngine } from '@loom-studio/data-engine'
import { createNarrativeStore } from '@loom-studio/application-data'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it, vi } from 'vitest'

function createTestContext() {
  let nextId = 0
  let nextTime = 0
  const createId = (prefix: string) => `${prefix}-${++nextId}`
  const now = () => `2026-08-12T00:00:${String(nextTime++).padStart(2, '0')}.000Z`
  const engine = createSqliteDataEngine({ filename: ':memory:', createId, now })
  const store = createNarrativeStore({ engine, createId, now })
  const actor = { kind: 'system' as const, id: 'test' }
  return { engine, store, actor }
}

describe('narrative store', () => {
  it('rejects stale State and locks opening replacement after path mutations', async () => {
    const { engine, store, actor } = createTestContext()
    try {
      const create = () => store.createTimeline({
        actor, stateRevisionId: 'initial', opening: { id: 'default', locked: false },
        openingNode: { body: { format: 'loom-markdown.v1', raw: 'Opening' } },
      })
      const created = await create()
      const target = { timelineId: created.timeline.id, branchId: created.branch.id }
      const replace = (input: Parameters<ReturnType<typeof store.transaction>['replaceOpening']>[0]) =>
        engine.transact({ actor }, tx => store.transaction(tx).replaceOpening(input))
      await store.setBranchStateHead({ ...target, actor, expectedStateHeadRevisionId: 'initial', stateRevisionId: 'configured' })
      await expect(replace({ ...target, expectedHeadNodeId: created.branch.headNodeId!, expectedStateHeadRevisionId: 'initial', openingNode: undefined }))
        .rejects.toMatchObject({ code: 'narrative.state_head_conflict' })
      expect((await store.getTimeline(target.timelineId))?.opening).toBeDefined()
      expect((await store.getPage(target)).nodes[0]?.body.raw).toBe('Opening')
      await expect(engine.transact({ actor }, tx => {
        store.transaction(tx).appendNode({
          ...target, expectedHeadNodeId: created.branch.headNodeId!, stateRevisionId: 'configured',
          body: { format: 'loom-markdown.v1', raw: 'rolled back' },
        })
        throw new Error('abort input')
      })).rejects.toThrow('abort input')
      expect((await store.getTimeline(target.timelineId))?.opening).toBeDefined()
      const old = await store.createTimeline({ actor, stateRevisionId: 'initial' })
      await expect(replace({ timelineId: old.timeline.id, branchId: old.branch.id, expectedHeadNodeId: null, expectedStateHeadRevisionId: 'initial', openingNode: undefined }))
        .rejects.toMatchObject({ code: 'narrative.opening_locked' })
      for (const mutation of ['append', 'fork'] as const) {
        const story = await create()
        const ids = { timelineId: story.timeline.id, branchId: story.branch.id }
        const node = story.nodes[0]!
        const body = { format: 'loom-markdown.v1' as const, raw: 'Keep this content' }
        if (mutation === 'append') await store.appendNode({ ...ids, actor, expectedHeadNodeId: node.id, stateRevisionId: 'initial', body })
        if (mutation === 'fork') await store.forkBranch({ timelineId: story.timeline.id, actor, fromBranchId: story.branch.id, fromNodeId: node.id, stateRevisionId: 'initial' })
        const page = await store.getPage(ids)
        expect(page.timeline.opening).toEqual({ id: 'default', nodeId: node.id, locked: true })
        await expect(replace({ ...ids, expectedHeadNodeId: page.branch.headNodeId!, expectedStateHeadRevisionId: 'initial', openingNode: undefined }))
          .rejects.toMatchObject({ code: 'narrative.opening_locked' })
        expect((await store.getPage(ids)).nodes).toEqual(page.nodes)
        const edited = await store.editNode({ ...ids, actor, nodeId: node.id, body })
        expect(edited.timeline.opening).toEqual(page.timeline.opening)
        const branchEdited = await store.editBranchNode({ ...ids, actor, nodeId: node.id, expectedHeadNodeId: page.branch.headNodeId!, expectedBody: body, body })
        expect(branchEdited.timeline.opening).toEqual(page.timeline.opening)
        expect(await store.getNode(node.id)).not.toBeNull()
      }
    } finally {
      engine.close()
    }
  })

  it('keeps an edited single initialization opening replaceable with its identity', async () => {
    const { engine, store, actor } = createTestContext()
    try {
      const created = await store.createTimeline({
        actor, stateRevisionId: 'initial', opening: { id: 'alternative', locked: false },
        openingNode: { body: { format: 'loom-markdown.v1', raw: 'First' } },
      })
      const target = { timelineId: created.timeline.id, branchId: created.branch.id }
      await store.setBranchStateHead({ ...target, actor, expectedStateHeadRevisionId: 'initial', stateRevisionId: 'configured' })
      const body = { format: 'loom-markdown.v1' as const, raw: 'Edited opening' }
      const direct = await store.editNode({ ...target, actor, nodeId: created.nodes[0]!.id, body })
      expect(direct.timeline.opening).toEqual({ id: 'alternative', nodeId: created.nodes[0]!.id, locked: false, custom: true })
      await expect(store.editBranchNode({
        ...target, actor, nodeId: created.nodes[0]!.id, expectedHeadNodeId: created.branch.headNodeId!,
        expectedBody: created.nodes[0]!.body, body,
      })).rejects.toMatchObject({ code: 'narrative.body_conflict' })
      const edited = await store.editBranchNode({
        ...target, actor, nodeId: created.nodes[0]!.id, expectedHeadNodeId: created.branch.headNodeId!,
        expectedBody: body, body: { ...body, raw: 'Edited again' },
      })
      const nodeId = edited.replacements[0]!.node.id
      expect(edited.timeline.opening).toEqual({ id: 'alternative', nodeId, locked: false, custom: true })
      expect(edited.branch.stateHeadRevisionId).toBe('configured')
      expect(edited.replacements.every(item => item.node.stateRevisionId === 'initial')).toBe(true)
      expect((await store.getPage(target)).nodes.map(node => node.body.raw)).toEqual(['Edited again'])
      expect(await store.getNode(created.nodes[0]!.id)).toBeNull()
      await expect(store.editBranchNode({
        ...target, actor, nodeId, expectedHeadNodeId: created.branch.headNodeId!,
        expectedBody: body, body,
      })).rejects.toMatchObject({ code: 'narrative.head_conflict' })
      const replaced = await engine.transact({ actor }, tx => store.transaction(tx).replaceOpening({
        ...target, expectedHeadNodeId: edited.branch.headNodeId!, expectedStateHeadRevisionId: 'configured', openingNode: undefined,
      }))
      expect(replaced.value.timeline.opening).toEqual({ locked: false })
      expect(await store.listNodes(target.timelineId)).toEqual([])
    } finally {
      engine.close()
    }
  })

  it('creates a timeline, opening path, branch, and one commit without Document rows', async () => {
    const { engine, store, actor } = createTestContext()
    const observed = vi.fn()
    engine.subscribeCommits(observed)

    const created = await store.createTimeline({
      actor,
      stateRevisionId: 'state-opening',
      title: 'Test Story',
      createdFrom: { cardId: 'card-1', cardVersion: 3 },
      promptResourceIds: ['setting-1', 'setting-1', 'preset-1'],
      openingNode: { id: 'opening-node', createdAt: '2026-08-12T00:00:00.000Z', body: { format: 'loom-markdown.v1', raw: 'Opening one' }, source: { runId: 'run-opening' } },
    })

    expect(created.timeline).toMatchObject({
      title: 'Test Story',
      promptResourceIds: ['setting-1', 'preset-1'],
      activeBranchId: created.branch.id,
    })
    expect(created.nodes).toHaveLength(1)
    expect(created.nodes[0]).toMatchObject({
      id: 'opening-node', createdAt: '2026-08-12T00:00:00.000Z',
      source: { runId: 'run-opening', changesetId: created.commit.changesetId },
    })
    expect(created.branch.headNodeId).toBe(created.nodes[0]?.id)
    expect(created.nodes[0]?.parentNodeId).toBeUndefined()
    const listed = await store.listTimelines({ createdFromCardId: 'card-1' })
    expect(listed.timelines[0]?.openingPreview).toBe('Opening one')
    expect(listed.timelines[0]?.latestPreview).toBe('Opening one')
    expect(created.commit.operations.map(operation => operation.entityType)).toEqual([
      'narrative.timeline',
      'narrative.branch',
      'narrative.node',
    ])
    expect(observed).toHaveBeenCalledOnce()
    expect(engine.database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('documents', 'document_revisions')").all()).toEqual([])
    engine.close()
  })

  it('appends atomically with expected-head protection and pages toward history without offset', async () => {
    const { engine, store, actor } = createTestContext()
    const created = await store.createTimeline({
      actor,
      stateRevisionId: 'state-one',
      openingNode: { body: { format: 'loom-markdown.v1', raw: 'one' } },
    })
    const second = await store.appendNode({
      actor,
      timelineId: created.timeline.id,
      branchId: created.branch.id,
      expectedHeadNodeId: created.branch.headNodeId ?? null,
      stateRevisionId: 'state-two',
      body: { format: 'loom-markdown.v1', raw: 'two' },
    })
    const third = await store.appendNode({
      actor,
      timelineId: created.timeline.id,
      branchId: created.branch.id,
      expectedHeadNodeId: second.node.id,
      stateRevisionId: 'state-three',
      body: { format: 'loom-markdown.v1', raw: 'three' },
    })

    const latest = await store.getPage({ timelineId: created.timeline.id, limit: 2 })
    const older = await store.getPage({ timelineId: created.timeline.id, cursor: latest.nextCursor, limit: 2 })
    expect(latest.nodes.map(node => node.body.raw)).toEqual(['two', 'three'])
    expect(older.nodes.map(node => node.body.raw)).toEqual(['one'])
    expect(older.nextCursor).toBeUndefined()

    const commitsBeforeConflict = engine.database.prepare('SELECT COUNT(*) AS count FROM changesets').get() as { count: number }
    await expect(store.appendNode({
      actor,
      timelineId: created.timeline.id,
      branchId: created.branch.id,
      expectedHeadNodeId: second.node.id,
      stateRevisionId: 'state-stale',
      body: { format: 'loom-markdown.v1', raw: 'stale write' },
    })).rejects.toMatchObject({ code: 'narrative.head_conflict' })
    const commitsAfterConflict = engine.database.prepare('SELECT COUNT(*) AS count FROM changesets').get() as { count: number }
    expect(commitsAfterConflict.count).toBe(commitsBeforeConflict.count)
    expect(await store.getNode(third.node.id)).toMatchObject({ body: { raw: 'three' } })
    expect(engine.database.prepare("SELECT id FROM narrative_nodes WHERE body_raw = 'stale write'").get()).toBeUndefined()
    engine.close()
  })

  it('updates Timeline Prompt Resource references with optimistic conflict protection', async () => {
    const { engine, store, actor } = createTestContext()
    const created = await store.createTimeline({ actor, stateRevisionId: 'state-resources', promptResourceIds: ['preset-1', 'setting-1'] })

    const updated = await store.updatePromptResources({
      actor,
      timelineId: created.timeline.id,
      promptResourceIds: ['setting-1'],
      expectedPromptResourceIds: ['preset-1', 'setting-1'],
    })

    expect(updated.timeline.promptResourceIds).toEqual(['setting-1'])
    await expect(store.updatePromptResources({
      actor,
      timelineId: created.timeline.id,
      promptResourceIds: [],
      expectedPromptResourceIds: ['preset-1', 'setting-1'],
    })).rejects.toMatchObject({ code: 'narrative.prompt_resources_conflict' })
    engine.close()
  })

  it('enforces branch and node identity bindings in SQLite', async () => {
    const { engine, store, actor } = createTestContext()
    const first = await store.createTimeline({
      actor,
      stateRevisionId: 'state-first',
      openingNode: { body: { format: 'loom-markdown.v1', raw: 'first' } },
    })
    const second = await store.createTimeline({
      actor,
      stateRevisionId: 'state-second',
      openingNode: { body: { format: 'loom-markdown.v1', raw: 'second' } },
    })

    expect(() => engine.database
      .prepare('UPDATE narrative_timelines SET active_branch_id = ? WHERE id = ?')
      .run(second.branch.id, first.timeline.id))
      .toThrow(/FOREIGN KEY constraint failed/)
    expect(() => engine.database
      .prepare('UPDATE narrative_branches SET head_node_id = ? WHERE id = ?')
      .run(second.nodes[0]?.id, first.branch.id))
      .toThrow(/FOREIGN KEY constraint failed/)
    expect(() => engine.database
      .prepare('UPDATE narrative_nodes SET parent_node_id = ? WHERE id = ?')
      .run(second.nodes[0]?.id, first.nodes[0]?.id))
      .toThrow(/FOREIGN KEY constraint failed/)
    engine.close()
  })

  it('rolls back an appended node and head update when the surrounding engine transaction fails', async () => {
    const { engine, store, actor } = createTestContext()
    const created = await store.createTimeline({
      actor,
      stateRevisionId: 'state-stable',
      openingNode: { body: { format: 'loom-markdown.v1', raw: 'stable head' } },
    })
    const originalHead = created.branch.headNodeId
    const commitCountBefore = engine.database.prepare('SELECT COUNT(*) AS count FROM changesets').get() as { count: number }

    await expect(engine.transact({ actor }, async dataTx => {
      store.transaction(dataTx).appendNode({
        timelineId: created.timeline.id,
        branchId: created.branch.id,
        expectedHeadNodeId: originalHead ?? null,
        nodeId: 'rolled-back-node',
        stateRevisionId: 'state-rolled-back',
        body: { format: 'loom-markdown.v1', raw: 'must disappear' },
      })
      throw new Error('abort narrative transaction')
    })).rejects.toThrow('abort narrative transaction')

    expect(await store.getNode('rolled-back-node')).toBeNull()
    expect(await store.getBranch(created.branch.id)).toMatchObject({ headNodeId: originalHead })
    expect(engine.database.prepare('SELECT COUNT(*) AS count FROM changesets').get()).toEqual(commitCountBefore)
    engine.close()
  })

  it('forks only from the source branch path and switches branches independently', async () => {
    const { engine, store, actor } = createTestContext()
    const created = await store.createTimeline({
      actor,
      stateRevisionId: 'state-main',
      openingNode: { body: { format: 'loom-markdown.v1', raw: 'root' } },
    })
    await store.appendNode({ actor, timelineId: created.timeline.id, branchId: created.branch.id,
      expectedHeadNodeId: created.branch.headNodeId!, stateRevisionId: 'state-main',
      body: { format: 'loom-markdown.v1', raw: 'main' },
    })
    const fork = await store.forkBranch({
      actor,
      timelineId: created.timeline.id,
      fromBranchId: created.branch.id,
      fromNodeId: created.nodes[0]!.id,
      stateRevisionId: 'state-root',
      title: 'Alternative',
    })
    const forkAppend = await store.appendNode({
      actor,
      timelineId: created.timeline.id,
      branchId: fork.branch.id,
      expectedHeadNodeId: created.nodes[0]!.id,
      stateRevisionId: 'state-fork',
      body: { format: 'loom-markdown.v1', raw: 'fork' },
    })
    const switched = await store.switchBranch({
      actor,
      timelineId: created.timeline.id,
      branchId: fork.branch.id,
      expectedActiveBranchId: created.branch.id,
    })

    expect(switched.timeline.activeBranchId).toBe(fork.branch.id)
    expect((await store.getPage({ timelineId: created.timeline.id })).nodes.map(node => node.body.raw)).toEqual(['root', 'fork'])
    expect((await store.getPage({ timelineId: created.timeline.id, branchId: created.branch.id })).nodes.map(node => node.body.raw)).toEqual(['root', 'main'])

    await expect(store.forkBranch({
      actor,
      timelineId: created.timeline.id,
      fromBranchId: created.branch.id,
      fromNodeId: forkAppend.node.id,
      stateRevisionId: 'state-invalid-fork',
    })).rejects.toMatchObject({ code: 'narrative.node_not_in_branch' })
    await expect(store.getPage({
      timelineId: created.timeline.id,
      branchId: created.branch.id,
      cursor: forkAppend.node.id,
    })).rejects.toMatchObject({ code: 'narrative.cursor_not_in_branch' })
    engine.close()
  })

  it('lists timelines by source card and returns every branch for one timeline', async () => {
    const { engine, store, actor } = createTestContext()
    const older = await store.createTimeline({
      actor,
      stateRevisionId: 'state-older',
      createdFrom: { cardId: 'card-1', cardVersion: 1 },
      title: 'Older',
    })
    const newer = await store.createTimeline({
      actor,
      stateRevisionId: 'state-newer',
      createdFrom: { cardId: 'card-1', cardVersion: 2 },
      title: 'Newer',
      openingNode: { body: { format: 'loom-markdown.v1', raw: 'opening' } },
    })
    await store.createTimeline({
      actor,
      stateRevisionId: 'state-other',
      createdFrom: { cardId: 'card-2', cardVersion: 1 },
      title: 'Other Card',
    })
    const fork = await store.forkBranch({
      actor,
      timelineId: newer.timeline.id,
      fromBranchId: newer.branch.id,
      fromNodeId: newer.nodes[0]!.id,
      stateRevisionId: 'state-newer-fork',
      title: 'Alternative',
    })

    const page = await store.listTimelines({ createdFromCardId: 'card-1', limit: 1 })
    const next = await store.listTimelines({ createdFromCardId: 'card-1', cursor: page.nextCursor, limit: 1 })
    expect(page.timelines.map(timeline => timeline.id)).toEqual([newer.timeline.id])
    expect(next.timelines.map(timeline => timeline.id)).toEqual([older.timeline.id])
    expect((await store.listBranches(newer.timeline.id)).map(branch => branch.id)).toEqual([
      newer.branch.id,
      fork.branch.id,
    ])
    engine.close()
  })

  it('supports cross-domain use of one engine transaction and tombstones only the timeline root', async () => {
    const { engine, store, actor } = createTestContext()
    const result = await engine.transact({ actor, reason: 'test.cross-domain' }, async dataTx => {
      const narrative = store.transaction(dataTx)
      const created = narrative.createTimeline({
        stateRevisionId: 'state-cross-domain',
        openingNode: { body: { format: 'loom-markdown.v1', raw: 'created together' } },
      })
      dataTx.database.exec('CREATE TABLE test_state (id TEXT PRIMARY KEY)')
      dataTx.database.prepare('INSERT INTO test_state (id) VALUES (?)').run('state-1')
      dataTx.recordOperations([{ store: 'test-state', kind: 'create', entityId: 'state-1', entityType: 'test.state' }])
      return created
    })

    expect(result.commit.operations.map(operation => operation.store)).toEqual([
      'narrative',
      'narrative',
      'narrative',
      'test-state',
    ])
    expect(engine.database.prepare('SELECT id FROM changesets').all()).toHaveLength(1)

    const deleted = await store.deleteTimeline({
      actor,
      timelineId: result.value.timeline.id,
      reason: 'test delete',
    })
    expect(deleted.timeline.deletedAt).toBeDefined()
    expect(await store.getTimeline(result.value.timeline.id)).toBeNull()
    expect(await store.getBranch(result.value.branch.id)).toBeNull()
    expect(await store.getNode(result.value.nodes[0]!.id)).toBeNull()
    expect(engine.database.prepare('SELECT COUNT(*) AS count FROM narrative_nodes').get()).toEqual({ count: 1 })
    engine.close()
  })

  it('persists the schema namespace and timeline data across engine instances', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'loom-narrative-'))
    const filename = join(directory, 'studio.sqlite')
    let nextId = 0
    const createId = (prefix: string) => `${prefix}-${++nextId}`
    const now = () => '2026-08-12T00:00:00.000Z'

    try {
      const firstEngine = createSqliteDataEngine({ filename, createId, now })
      const firstStore = createNarrativeStore({ engine: firstEngine, createId, now })
      const created = await firstStore.createTimeline({
        actor: { kind: 'system', id: 'test' },
        stateRevisionId: 'state-persistent',
        openingNode: { body: { format: 'loom-markdown.v1', raw: 'persistent' } },
      })
      firstEngine.close()

      const secondEngine = createSqliteDataEngine({ filename, createId, now })
      const secondStore = createNarrativeStore({ engine: secondEngine, createId, now })
      expect(await secondStore.getPage({ timelineId: created.timeline.id })).toMatchObject({
        nodes: [{ body: { raw: 'persistent' } }],
      })
      secondEngine.close()

      const database = new DatabaseSync(filename)
      const migration = database
        .prepare('SELECT version FROM schema_migrations WHERE namespace = ?')
        .get('application.narrative')
      const changesets = database.prepare('SELECT COUNT(*) AS count FROM changesets').get()
      database.close()
      expect(migration).toEqual({ version: 4 })
      expect(changesets).toEqual({ count: 1 })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('updates timeline title with audit operation', async () => {
    const { engine, store, actor } = createTestContext()
    const created = await store.createTimeline({
      actor,
      stateRevisionId: 'state-1',
      title: 'Original Title',
    })

    const updated = await store.updateTimeline({
      actor,
      timelineId: created.timeline.id,
      title: 'Renamed Story',
    })

    expect(updated.timeline.title).toBe('Renamed Story')
    expect(updated.commit.operations).toEqual([
      { store: 'narrative', kind: 'update', entityId: created.timeline.id, entityType: 'narrative.timeline' },
    ])

    const fetched = await store.getTimeline(created.timeline.id)
    expect(fetched?.title).toBe('Renamed Story')
    engine.close()
  })
})

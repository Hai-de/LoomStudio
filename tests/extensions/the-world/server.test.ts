import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyJsonPatch, applyMutation, validateWorldRoot } from '../../../extensions/the-world/src/server/index.js'
import { createWorldRoot, projectCurrentWorld, upgradeWorldV1 } from '../../../extensions/the-world/src/world-state.js'

const branch = { timelineId: 'timeline-1', branchId: 'branch-1' }
const example = () => JSON.parse(readFileSync(new URL('../../../extensions/the-world/resources/examples/world-v2.json', import.meta.url), 'utf8'))

describe('The World v2 contract', () => {
  it('initializes an unknown world without invented dates or weather', () => {
    const root = createWorldRoot()
    expect(validateWorldRoot(root)).toBe(root)
    expect(projectCurrentWorld(root)).toMatchObject({ time: undefined, weather: undefined, scene: undefined })
    expect(root).not.toHaveProperty('branch')
  })
  it('uses explicit scene and place references, preserving midnight', () => {
    const current = projectCurrentWorld(example())
    expect(current.scene?.id).toBe('arrival')
    expect(current.place?.id).toBe('pier')
    expect(current.time?.value.hour).toBe(0)
    expect(() => applyJsonPatch(example(), [{ op: 'remove', path: '/entities/pier' }])).toThrow('reference is missing')
    expect(() => applyJsonPatch(example(), [{
      op: 'add', path: '/entities/harbor/components/place/parentPlaceId', value: 'pier',
    }])).toThrow('cyclic')
  })
  it('validates the whole batch, allowing a scene and pointer to be added together', () => {
    const entity = { schemaVersion: 2, id: 'scene', kind: 'scene', createdBy: 'author', components: { scene: { version: 1, name: 'Atrium' } } } as const
    const next = applyMutation(createWorldRoot(), {
      schemaVersion: 2, target: branch, expectedRevisionId: 'rev-1', idempotencyKey: 'mutation-1',
      operations: [
        { op: 'upsert-entity', entity },
        { op: 'set-component', entityId: 'world', component: 'world', value: { version: 1, currentSceneId: 'scene' } },
      ],
    }, 'rev-1', branch)
    expect(projectCurrentWorld(next).scene).toEqual(entity)
    expect(() => applyMutation(next, {
      schemaVersion: 2, target: { ...branch, branchId: 'other' }, expectedRevisionId: 'rev-1', idempotencyKey: 'other',
      operations: [{ op: 'remove-entity', entityId: 'scene' }],
    }, 'rev-1', branch)).toThrow('branch does not match')
    expect(() => Reflect.apply(applyMutation, undefined, [next, {
      schemaVersion: 2, target: branch, expectedRevisionId: 'rev-1',
      operations: [{ op: 'typo', entityId: 'scene' }],
    }, 'rev-1', branch])).toThrow('operation is invalid')
  })
  it.each([{ hour: 24 }, { minute: 60 }, { month: 0 }, { day: -1 }, { second: 60 }, { millisecond: 1000 }])('rejects malformed time %j', change => {
    const root = example()
    Object.assign(root.entities.world.components.worldTime.value, change)
    expect(() => validateWorldRoot(root)).toThrow('time component is invalid')
  })
  it('checks dates against their custom calendar, not Gregorian Date', () => {
    const root = example()
    root.entities.world.components.calendar.months[0].days = 40
    root.entities.world.components.worldTime.value.day = 40
    expect(validateWorldRoot(root)).toBe(root)
    root.entities.world.components.worldTime.value.day = 41
    expect(() => validateWorldRoot(root)).toThrow('outside its calendar')
  })
  it('rejects array element paths and unsafe keys, but permits whole array replacement', () => {
    const root = example()
    root.entities.arrival.components.scene.participantEntityIds = ['a', 'b']
    expect(() => applyJsonPatch(root, [{
      op: 'add', path: '/entities/arrival/components/scene/participantEntityIds/0', value: 'c',
    }])).toThrow('must traverse existing objects')
    expect(() => applyJsonPatch(root, [{ op: 'add', path: '/entities/__proto__', value: {} }])).toThrow('path is invalid')
    expect(applyJsonPatch(root, [{
      op: 'replace', path: '/entities/arrival/components/scene/participantEntityIds', value: ['c'],
    }]).entities.arrival!.components.scene!.participantEntityIds).toEqual(['c'])
    expect(root.entities.arrival.components.scene.participantEntityIds).toEqual(['a', 'b'])
  })
  it('requires explicit upgrade and never mutates the v1 source', () => {
    const old = { schemaVersion: 1, branch, entities: {
      legacy: { schemaVersion: 1, id: 'legacy', kind: 'world', branch, createdBy: 'migration', components: {} },
    } }
    expect(() => validateWorldRoot(old)).toThrow('explicitly upgrade')
    expect(() => upgradeWorldV1(old)).toThrow('worldEntityId explicitly')
    const next = upgradeWorldV1(old, { worldEntityId: 'legacy' })
    expect(next.entities.world.id).toBe('world')
    expect(next.entities.world).not.toHaveProperty('branch')
    expect(old.entities.legacy.branch).toEqual(branch)
    expect(old.schemaVersion).toBe(1)
  })
})

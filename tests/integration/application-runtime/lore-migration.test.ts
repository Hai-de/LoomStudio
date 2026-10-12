import { createSqliteDataEngine } from '../../../packages/data-engine/src/index.js'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { migrateVersionOne, migrateVersionTwo, migrateVersionThree, migrateVersionFour, migrateVersionFive, migrateVersionSix } from '../../../packages/application-data/src/prompt-resource/schema.js'
import { migrateLoreDocuments } from '../../../packages/application-data/src/prompt-resource/lore-migration.js'

describe('one-time Lore migration', () => {
  it('applies the versioned upgrade exactly once through the real migration engine', async () => {
    const engine = createSqliteDataEngine({ filename: ':memory:', createId: () => 'unused', now: () => 'unused' })
    try {
      const migrations = [migrateVersionOne, migrateVersionTwo, migrateVersionThree, migrateVersionFour, migrateVersionFive]
        .map((migrate, index) => ({ version: index + 1, migrate }))
      engine.migrate({ namespace: 'application.prompt-resource', migrations })
      migrations.push({ version: 6, migrate: migrateVersionSix })
      engine.migrate({ namespace: 'application.prompt-resource', migrations })
      engine.migrate({ namespace: 'application.prompt-resource', migrations })
      expect(engine.database.prepare("SELECT name FROM sqlite_master WHERE name = 'global_lore_mounts'").get()).toBeDefined()
      expect(engine.database.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    } finally { await engine.close() }
  })

  it('preserves identities and bodies while migrating revisions, mounts and typed checkpoints', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec('PRAGMA foreign_keys = OFF')
      for (const migration of [migrateVersionOne, migrateVersionTwo, migrateVersionThree, migrateVersionFour, migrateVersionFive]) migration(db)
      const body = 'settingLayer @setting.stable useCardSettings 设置正文'
      const metadata = { useCardSettings: false, custom: { useCardSettings: true } }
      db.prepare('INSERT INTO prompt_resources VALUES (?, ?, ?, ?, 2, ?, ?, ?, 0, NULL, NULL, NULL)')
        .run('resource.setting', 'setting', 'node.setting', 'Setting title', JSON.stringify(metadata), 'created', 'updated')
      db.prepare('INSERT INTO prompt_resource_nodes VALUES (?, ?, NULL, 0, ?, ?, ?, NULL, 1, ?, ?, ?, ?, ?)')
        .run('node.setting', 'resource.setting', 'entry', 'setting', 'Node', body,
          JSON.stringify({ targetAnchorId: '@setting.stable' }), JSON.stringify({ settingLayer: body }), 'created', 'updated')
      db.prepare('INSERT INTO global_setting_mounts VALUES (?, ?, NULL, ?, ?, 0, ?, ?)')
        .run('mount.setting', 'resource.setting', 'manual', 'source', '{}', 'created')
      const oldNode = { id: 'node.setting', category: 'setting', body, capabilities: { targetAnchorId: '@setting.lower', accepts: ['settingLayer', 'preset'] }, extra: { category: 'setting' } }
      db.prepare('INSERT INTO prompt_resource_node_revisions VALUES (?, 2, ?, ?, ?, ?, ?, ?, ?)')
        .run('resource.setting', 'node.setting', 'update', JSON.stringify(oldNode), JSON.stringify(oldNode), 'change', 'created', '{}')
      db.prepare('INSERT INTO prompt_resource_header_revisions VALUES (?, 2, ?, ?, ?, ?, ?)')
        .run('resource.setting', JSON.stringify({ metadata }), JSON.stringify({ metadata }), 'change', 'created', '{}')
      db.exec(`CREATE TABLE documents (id TEXT, type TEXT, content_json TEXT);
        CREATE TABLE document_revisions (document_id TEXT, type TEXT, content_json TEXT);
        CREATE TABLE agent_transcript_entries (id TEXT, entry_json TEXT);`)
      const card = { settingLayer: { entries: [{ id: 'setting.entry', content: body }] }, custom: { settingLayer: body } }
      for (const table of ['documents', 'document_revisions']) {
        db.prepare(`INSERT INTO ${table} VALUES (?, ?, ?)`).run('card', 'airp.cardSource', JSON.stringify(card))
        db.prepare(`INSERT INTO ${table} VALUES (?, ?, ?)`).run('extension', 'airp.extensionRecord', JSON.stringify(card))
      }
      const checkpoint = { kind: 'run-state', recovery: {
        messages: [{ content: body }], acceptedContent: { mutation: { settingLayer: body } },
        processedPrompt: { sourceNodes: [{ id: 'setting.node', body, capabilities: { targetAnchorId: '@setting.stable' } }],
          contributions: [{ sourceRef: { kind: 'settingLayer', sourceId: 'setting.resource' }, content: body, capabilities: { targetAnchorId: '@setting.lower' } }],
          projection: { messages: [{ content: body }], editorProjection: { sourceRows: [{ targetAnchorId: '@setting.lower' }], promptRows: [] } } },
      } }
      db.prepare('INSERT INTO agent_transcript_entries VALUES (?, ?)').run('entry', JSON.stringify(checkpoint))
      migrateVersionSix(db)
      migrateLoreDocuments(db)
      const read = (table: string, column: string, where = '') => JSON.parse((db.prepare(`SELECT ${column} FROM ${table} ${where}`).get() as Record<string, string>)[column]!)
      expect(db.prepare('SELECT resource_kind, id FROM prompt_resources').get()).toMatchObject({ resource_kind: 'lore', id: 'resource.setting' })
      expect(db.prepare('SELECT lore_resource_id, id FROM global_lore_mounts').get()).toMatchObject({ lore_resource_id: 'resource.setting', id: 'mount.setting' })
      expect(db.prepare('SELECT body FROM prompt_resource_nodes').get()).toMatchObject({ body })
      expect(read('prompt_resources', 'metadata_json')).toEqual({ useCardLore: false, custom: { useCardSettings: true } })
      expect(read('prompt_resource_node_revisions', 'before_json')).toEqual({ ...oldNode, category: 'lore', capabilities: { targetAnchorId: '@lore.lower', accepts: ['lore', 'preset'] } })
      expect(read('prompt_resource_header_revisions', 'before_json').metadata.useCardLore).toBe(false)
      for (const table of ['documents', 'document_revisions']) {
        expect(read(table, 'content_json', "WHERE type = 'airp.cardSource'")).toEqual({ lore: card.settingLayer, custom: card.custom })
        expect(read(table, 'content_json', "WHERE type = 'airp.extensionRecord'")).toEqual(card)
      }
      const migrated = read('agent_transcript_entries', 'entry_json')
      expect(migrated.recovery.messages).toEqual(checkpoint.recovery.messages)
      expect(migrated.recovery.acceptedContent).toEqual(checkpoint.recovery.acceptedContent)
      expect(migrated.recovery.processedPrompt.contributions[0].sourceRef.kind).toBe('lore')
      expect(migrated.recovery.processedPrompt.sourceNodes[0].capabilities.targetAnchorId).toBe('@lore.stable')
      migrateLoreDocuments(db)
      expect(read('agent_transcript_entries', 'entry_json')).toEqual(migrated)
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
    } finally { db.close() }
  })
})

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createSqliteDataEngine } from '../../packages/data-engine/src/index.js'
import { createSqliteDocumentStore } from '../../packages/document-store/src/sqlite-store.js'
import { createAgentStore } from '../../packages/application-data/src/agent/store.js'
import { createPromptResourceStore } from '../../packages/application-data/src/prompt-resource/store.js'
import { migrateLoreDocuments } from '../../packages/application-data/src/prompt-resource/lore-migration.js'

// Explicit offline path only. Stop writers and create a consistent backup before running on live data.
const filename = process.argv[2]
if (!filename || process.argv.length !== 3 || !existsSync(filename)) {
  throw new Error('Usage: pnpm exec tsx scripts/data/migrate-lore.ts <existing-offline-database>')
}
const engine = createSqliteDataEngine({ filename: resolve(filename), createId: prefix => `${prefix}.${randomUUID()}`, now: () => new Date().toISOString() })
try {
  createSqliteDocumentStore({ engine })
  createPromptResourceStore({ engine })
  createAgentStore({ engine })
  engine.migrate({ namespace: 'application.lore-documents', migrations: [{ version: 1, migrate: migrateLoreDocuments }] })
  const violations = engine.database.prepare('PRAGMA foreign_key_check').all()
  if (violations.length) throw new Error(`Migrated database has ${violations.length} foreign-key violations`)
  const count = (table: string) => (engine.database.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number }).count
  console.log(JSON.stringify({ database: resolve(filename), documents: count('documents'), documentRevisions: count('document_revisions'), resources: count('prompt_resources'), nodes: count('prompt_resource_nodes'), mounts: count('global_lore_mounts'), foreignKeyViolations: 0 }))
} finally {
  await engine.close()
}

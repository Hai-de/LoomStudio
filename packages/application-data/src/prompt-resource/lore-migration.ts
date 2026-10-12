import type { DatabaseSync } from 'node:sqlite'

type RecordValue = Record<string, unknown>
function object(value: unknown): value is RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function rename(value: RecordValue, oldKey: string, newKey: string): void {
  if (!(oldKey in value)) return
  if (newKey in value) throw new Error(`Lore migration found both ${oldKey} and ${newKey}`)
  value[newKey] = value[oldKey]
  delete value[oldKey]
}
function anchor(value: RecordValue): void {
  if (Array.isArray(value.accepts)) value.accepts = value.accepts.map(kind => kind === 'settingLayer' ? 'lore' : kind)
  if (typeof value.targetAnchorId === 'string' && value.targetAnchorId.startsWith('@setting.')) {
    value.targetAnchorId = '@lore.' + value.targetAnchorId.slice('@setting.'.length)
  }
}
function node(value: RecordValue): void {
  if (value.category === 'setting') value.category = 'lore'
  if (object(value.capabilities)) anchor(value.capabilities)
}
function metadata(value: RecordValue): void {
  rename(value, 'useCardSettings', 'useCardLore')
}
// Only named protocol fields are transformed. Bodies, IDs, extension data and State are opaque.
function updateJson(database: DatabaseSync, table: string, column: string, transform: (value: RecordValue, row: RecordValue) => void, where = ''): void {
  const rows = database.prepare(`SELECT rowid AS migration_rowid, * FROM ${table} ${where}`).all() as RecordValue[]
  const update = database.prepare(`UPDATE ${table} SET ${column} = ? WHERE rowid = ?`)
  for (const row of rows) {
    const source = row[column]
    if (source === null) continue
    const value: unknown = JSON.parse(source as string)
    if (!object(value)) throw new Error(`Lore migration expected object in ${table}.${column}`)
    const before = JSON.stringify(value)
    transform(value, row)
    const after = JSON.stringify(value)
    if (before !== after) update.run(after, row.migration_rowid as number)
  }
}

export function migrateLorePromptData(database: DatabaseSync): void {
  database.exec(`
    ALTER TABLE global_setting_mounts RENAME TO global_lore_mounts;
    ALTER TABLE global_lore_mounts RENAME COLUMN setting_resource_id TO lore_resource_id;
    DROP INDEX idx_global_setting_mounts_source;
    DROP INDEX idx_global_setting_mounts_setting;
    CREATE INDEX idx_global_lore_mounts_source ON global_lore_mounts(source_kind, source_id, order_index, id);
    CREATE INDEX idx_global_lore_mounts_lore ON global_lore_mounts(lore_resource_id);
    UPDATE prompt_resources SET resource_kind = 'lore' WHERE resource_kind = 'setting';
    UPDATE prompt_resource_nodes SET category = 'lore' WHERE category = 'setting';
    UPDATE preset_tool_mounts SET target_anchor_id = '@lore.' || substr(target_anchor_id, 10) WHERE target_anchor_id LIKE '@setting.%';
  `)
  updateJson(database, 'prompt_resources', 'metadata_json', metadata)
  updateJson(database, 'prompt_resource_nodes', 'capabilities_json', anchor)
  for (const column of ['before_json', 'after_json']) {
    updateJson(database, 'prompt_resource_node_revisions', column, node)
    updateJson(database, 'prompt_resource_header_revisions', column, value => {
      if (object(value.metadata)) metadata(value.metadata)
    })
  }
}

export function migrateLoreDocuments(database: DatabaseSync): void {
  for (const table of ['documents', 'document_revisions']) {
    updateJson(database, table, 'content_json', value => {
      rename(value, 'settingLayer', 'lore')
      if (!('lore' in value) && object(value.setting)) {
        value.lore = { entries: Object.keys(value.setting).length ? [{
          id: 'legacy.setting', path: 'legacy.setting', title: 'Imported Setting',
          content: JSON.stringify(value.setting), enabled: true, activation: { kind: 'always' }, tags: ['legacy'],
        }] : [] }
      }
      delete value.setting
    }, "WHERE type = 'airp.cardSource'")
  }
  updateJson(database, 'agent_transcript_entries', 'entry_json', value => {
    if (value.kind !== 'run-state' || !object(value.recovery)) return
    const snapshot = value.recovery.processedPrompt
    if (!object(snapshot)) return
    if (Array.isArray(snapshot.sourceNodes)) for (const item of snapshot.sourceNodes) {
      if (object(item)) node(item)
    }
    if (Array.isArray(snapshot.contributions)) for (const item of snapshot.contributions) {
      if (!object(item)) continue
      if (object(item.sourceRef) && item.sourceRef.kind === 'settingLayer') item.sourceRef.kind = 'lore'
      if (object(item.capabilities)) anchor(item.capabilities)
    }
    if (object(snapshot.projection) && object(snapshot.projection.editorProjection)) {
      for (const key of ['sourceRows', 'promptRows']) {
        const rows = snapshot.projection.editorProjection[key]
        if (Array.isArray(rows)) for (const item of rows) if (object(item)) anchor(item)
      }
    }
  })
}

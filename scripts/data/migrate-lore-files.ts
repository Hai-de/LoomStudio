import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile, access } from 'node:fs/promises'
import { resolve, join } from 'node:path'

type Json = Record<string, any>
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const encode = (value: unknown) => Buffer.from(JSON.stringify(value, null, 2) + '\n')
const exists = async (path: string) => access(path).then(() => true, error => {
  if (error.code === 'ENOENT') return false
  throw error
})
function rename(value: Json, from: string, to: string) {
  if (!(from in value)) return
  if (to in value) throw new Error(`Both ${from} and ${to} occur in a Lore migration input`)
  value[to] = value[from]
  delete value[from]
}
function capabilities(value: Json | undefined) {
  if (!value) return
  if (typeof value.targetAnchorId === 'string' && value.targetAnchorId.startsWith('@setting.')) {
    value.targetAnchorId = '@lore.' + value.targetAnchorId.slice('@setting.'.length)
  }
  if (Array.isArray(value.accepts)) value.accepts = value.accepts.map((kind: string) => kind === 'settingLayer' ? 'lore' : kind)
}
function node(value: Json) {
  if (value.category === 'setting') value.category = 'lore'
  capabilities(value.capabilities)
  for (const child of value.children ?? []) node(child)
}
function fileNode(value: Json) {
  node(value.metadata)
  for (const child of value.children ?? []) fileNode(child)
}
function artifact(value: Json) {
  rename(value.card, 'settingLayer', 'lore')
  for (const item of value.contextAssets ?? []) node(item)
}

// Offline helper: the caller backs up the whole data directory and stops writers first.
// Only protocol JSON is rewritten; text files, IDs, State and extension payloads remain opaque.
export async function migrateLoreFiles(dataRoot: string, apply: boolean) {
  const changes = new Map<string, Buffer>()
  const metadataRoot = join(dataRoot, '.loom/card-directories')
  if (!await exists(metadataRoot)) return { changedFiles: 0, directories: 0 }
  const ids = await readdir(metadataRoot)
  let directories = 0
  for (const id of ids) {
    const metadata = join(metadataRoot, id)
    for (const marker of ['apply.json', 'delete.json', 'import.json', 'pending/journal.json']) {
      if (await exists(join(metadata, marker))) throw new Error(`Recover unfinished Card directory operation first: ${id}/${marker}`)
    }
    const baselinePath = join(metadata, 'baseline.json')
    if (!await exists(baselinePath)) continue
    const baseline: Json = JSON.parse(await readFile(baselinePath, 'utf8'))
    const originalBaseline = JSON.stringify(baseline)
    const bindingPath = join(metadata, 'binding.json')
    const binding = await exists(bindingPath) ? JSON.parse(await readFile(bindingPath, 'utf8')) : undefined
    const directory = join(dataRoot, 'characters', binding?.directoryName ?? id)
    const manifest: Json = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'))
    const resources = manifest.resources
    if (!resources || typeof resources.card !== 'string') throw new Error(`Unsupported Card files manifest: ${id}`)
    const convert = async (relative: string, transform: (value: Json) => void) => {
      const path = resolve(directory, relative)
      if (!path.startsWith(resolve(directory) + '/')) throw new Error(`Card path escapes its directory: ${relative}`)
      const bytes = await readFile(path)
      const value: Json = JSON.parse(bytes.toString('utf8'))
      const before = JSON.stringify(value)
      transform(value)
      if (before === JSON.stringify(value)) return
      const after = encode(value)
      changes.set(path, after)
      // Preserve an existing unsaved-file conflict instead of accepting a user's edits as baseline.
      if (baseline.files[relative] === hash(bytes)) baseline.files[relative] = hash(after)
    }
    await convert(resources.card, value => rename(value, 'settingLayer', 'lore'))
    for (const path of resources.contextAssets ?? []) await convert(path, fileNode)
    if (baseline.snapshot?.artifact) artifact(baseline.snapshot.artifact)
    if (JSON.stringify(baseline) !== originalBaseline) changes.set(baselinePath, encode(baseline))
    directories++
  }
  if (apply) for (const [path, bytes] of changes) await writeFile(path, bytes)
  return { changedFiles: changes.size, directories }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const [root, flag] = process.argv.slice(2)
  if (!root || (flag && flag !== '--apply')) throw new Error('Usage: tsx scripts/data/migrate-lore-files.ts <offline-data-root> [--apply]')
  console.log(JSON.stringify(await migrateLoreFiles(resolve(root), flag === '--apply')))
}

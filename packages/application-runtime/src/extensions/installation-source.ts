import { isAbsolute } from 'node:path'
import { isRecord } from '@loom-studio/shared'
import type { ExtensionInstallationSource, ExtensionInstallationTarget } from '../types.js'

export function parseExtensionInstallationSource(
  value: unknown,
  target: ExtensionInstallationTarget,
): ExtensionInstallationSource {
  if (!isRecord(value)) throw new Error('Extension installation source must be an object')
  if (target.kind === 'card') {
    if (value.kind !== 'card') throw new Error('Card installations must use their Card source')
    return { kind: 'card' }
  }
  if (value.kind === 'local' && typeof value.directory === 'string' && isAbsolute(value.directory)) {
    return { kind: 'local', directory: value.directory }
  }
  if ((value.kind === 'git' || value.kind === 'zip') && typeof value.url === 'string') {
    const url = new URL(value.url)
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) {
      throw new Error('Extension source URL must be HTTPS without credentials or fragment')
    }
    return { kind: value.kind, url: url.toString() }
  }
  throw new Error('Invalid Extension installation source')
}

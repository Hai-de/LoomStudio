import type { JsonObject } from '@loom-studio/shared'

/** A resource opts into a processor by its package-qualified ID. */
export type ExtensionPromptEntry = {
  id: string
  sourceId: string
  sourceNodeId: string
  kind: 'preset' | 'lore'
  label: string
  sourceLabel?: string
  metadata?: JsonObject
  content: string
}

export type ExtensionPromptProcessingContext = {
  mode: 'preview' | 'runtime'
  signal: AbortSignal
  cardId?: string
  /** Supplied only for a Timeline build and a module with state.read. */
  timeline?: {
    timelineId: string
    branchId: string
    revisionId: string
    value: JsonObject
  }
}

export type ExtensionPromptEntryPatch = {
  id: string
  content?: string
  /** Overrides this build's activation, never the persistent enabled flag. */
  active?: boolean
}

export type ExtensionPromptProcessingSession = {
  prepare?(entries: readonly ExtensionPromptEntry[]): Promise<ExtensionPromptEntryPatch[]> | ExtensionPromptEntryPatch[]
  render(entry: ExtensionPromptEntry): Promise<string> | string
  dispose?(): Promise<void> | void
}

export type ExtensionPromptProcessor = {
  id: string
  /** A fresh session per build; preview and separate Runs must not share guest state. */
  create(context: ExtensionPromptProcessingContext): Promise<ExtensionPromptProcessingSession> | ExtensionPromptProcessingSession
}

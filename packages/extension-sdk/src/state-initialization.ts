import type { JsonObject } from '@loom-studio/shared'

export type ExtensionStateInitializationContext = {
  cardId: string
  characterName: string
  /** Selected opening with ordinary macros expanded; empty when adopting into an existing Timeline. */
  opening: string
  openingId?: string
  resources: ReadonlyArray<{
    id: string
    name: string
    metadata?: JsonObject
    entries: ReadonlyArray<{ id: string; label: string; content: string; enabled: boolean }>
  }>
  signal: AbortSignal
}

export type ExtensionStateInitializer = (
  context: ExtensionStateInitializationContext,
) => Promise<Record<string, JsonObject>> | Record<string, JsonObject>

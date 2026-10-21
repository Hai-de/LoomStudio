import type { ExtensionNarrativeActivity } from '@loom-studio/extension-sdk'

/** Delivery only schedules extension work; foreground turns never await it. */
export function createNarrativeActivityRegistry() {
  const listeners = new Set<(event: ExtensionNarrativeActivity) => void>()
  return {
    subscribe(listener: (event: ExtensionNarrativeActivity) => void) {
      listeners.add(listener)
      return { dispose() { listeners.delete(listener) } }
    },
    emit(event: ExtensionNarrativeActivity) {
      for (const listener of listeners) listener(structuredClone(event))
    },
  }
}

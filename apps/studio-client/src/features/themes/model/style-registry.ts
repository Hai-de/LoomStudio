import type { ClientStyleFactory, ExtensionRegistrationHandle } from '@loom-studio/extension-sdk'

export type StyleFactoryRegistration = { factory: ClientStyleFactory; signal: AbortSignal; revision: number }
export function styleKey(packageId: string, contributionId: string): string {
  return `${packageId}/${contributionId}`
}

export function createStyleRegistry() {
  const factories = new Map<string, StyleFactoryRegistration>()
  const listeners = new Set<() => void>()
  let revision = 0
  const emit = () => { revision++; for (const listener of listeners) listener() }
  return {
    get: (key: string) => factories.get(key),
    revision: () => revision,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    register(key: string, factory: ClientStyleFactory, signal: AbortSignal): ExtensionRegistrationHandle {
      signal.throwIfAborted()
      if (factories.has(key)) throw new Error(`Style factory already registered: ${key}`)
      const registration = { factory, signal, revision: revision + 1 }
      factories.set(key, registration)
      const dispose = () => {
        signal.removeEventListener('abort', dispose)
        if (factories.get(key) === registration) { factories.delete(key); emit() }
      }
      signal.addEventListener('abort', dispose, { once: true })
      emit()
      return { dispose }
    },
  }
}

export const styleRegistry = createStyleRegistry()

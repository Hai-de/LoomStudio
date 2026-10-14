import type {
  ExtensionInstallationTarget,
  ExtensionPromptProcessingContext,
  ExtensionPromptProcessingSession,
  ExtensionPromptProcessor,
} from '@loom-studio/extension-sdk'

export type PromptProcessorRegistry = {
  register(processor: ExtensionPromptProcessor, target?: ExtensionInstallationTarget): { dispose(): void }
  create(id: string, context: ExtensionPromptProcessingContext): Promise<ExtensionPromptProcessingSession>
}

export function createPromptProcessorRegistry(): PromptProcessorRegistry {
  const registrations = new Map<string, {
    processor: ExtensionPromptProcessor
    controller: AbortController
  }>()
  const key = (id: string, target: ExtensionInstallationTarget) =>
    JSON.stringify([id, target.kind, target.kind === 'card' ? target.cardId : null])
  return {
    register(processor, target = { kind: 'global' }) {
      if (!processor.id.trim() || typeof processor.create !== 'function')
        throw new Error('Prompt processor requires an ID and a session factory')
      const id = key(processor.id, target)
      if (registrations.has(id)) throw new Error(`Prompt processor already registered: ${processor.id}`)
      const registration = { processor, controller: new AbortController() }
      registrations.set(id, registration)
      return { dispose() {
        if (registrations.get(id) !== registration) return
        registrations.delete(id)
        registration.controller.abort()
      } }
    },
    async create(id, context) {
      const registration = (context.cardId
        ? registrations.get(key(id, { kind: 'card', cardId: context.cardId })) : undefined)
        ?? registrations.get(key(id, { kind: 'global' }))
      if (!registration) throw new Error(`Prompt processor unavailable: ${id}`)
      const signal = AbortSignal.any([context.signal, registration.controller.signal])
      signal.throwIfAborted()
      const session = await registration.processor.create({
        ...context,
        signal,
        ...(context.timeline ? { timeline: structuredClone(context.timeline) } : {}),
      })
      // Own cleanup even if disposal races the async factory.
      if (signal.aborted) {
        try { await session.dispose?.() } catch (cleanupError) {
          throw Object.assign(new AggregateError([signal.reason, cleanupError], 'Prompt processor creation was aborted; cleanup also failed', { cause: signal.reason }), { name: 'AbortError' })
        }
        signal.throwIfAborted()
      }
      return {
        ...(session.prepare ? { prepare: async entries => {
          signal.throwIfAborted()
          const patches = await session.prepare!(entries)
          signal.throwIfAborted()
          return patches
        } } : {}),
        async render(entry) {
          signal.throwIfAborted()
          const result = await session.render(entry)
          signal.throwIfAborted()
          return result
        },
        dispose: () => session.dispose?.(),
      }
    },
  }
}

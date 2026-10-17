import type { ExtensionRegistrationHandle, StyleAnimationHandler, StyleAnimationSurface } from '@loom-studio/extension-sdk'

type Registration = { owner: string; surface: StyleAnimationSurface; handler: StyleAnimationHandler; signal: AbortSignal }

export function createStyleMotion() {
  const registrations = new Set<Registration>()
  const running = new Map<HTMLElement, AbortController>()
  let owners: readonly string[] = []
  let nativeMotion: 'retain' | 'disable' = 'retain'
  const cancelAll = () => { for (const controller of running.values()) controller.abort() }
  return {
    register(owner: string, surface: StyleAnimationSurface, handler: StyleAnimationHandler, signal: AbortSignal): ExtensionRegistrationHandle {
      signal.throwIfAborted()
      if (surface !== 'workbench.panel') throw new Error(`Unsupported animation surface: ${surface}`)
      const registration = { owner, surface, handler, signal }
      const dispose = () => {
        if (registrations.delete(registration)) cancelAll()
        signal.removeEventListener('abort', dispose)
      }
      if (!signal.aborted) {
        registrations.add(registration)
        signal.addEventListener('abort', dispose, { once: true })
      }
      return { dispose }
    },
    setOwners(next: readonly string[], motion: 'retain' | 'disable') {
      if (motion !== nativeMotion || next.join('\0') !== owners.join('\0')) cancelAll()
      owners = [...next]
      nativeMotion = motion
      document.documentElement.dataset.loomNativeMotion = motion
    },
    async run(element: HTMLElement, phase: 'enter' | 'exit', signal: AbortSignal): Promise<void> {
      running.get(element)?.abort()
      if (signal.aborted) return
      const controller = new AbortController()
      running.set(element, controller)
      const abort = () => controller.abort()
      signal.addEventListener('abort', abort, { once: true })
      let cancel = () => {}
      let timer: ReturnType<typeof setTimeout> | undefined
      let onAbort = () => {}
      try {
        const reduced = document.documentElement.dataset.loomMotion === 'reduce'
        const registration = [...registrations].filter(item => owners.includes(item.owner) && !item.signal.aborted)
          .sort((a, b) => owners.indexOf(a.owner) - owners.indexOf(b.owner)).at(-1)
        element.dataset.loomMotionOwner = reduced ? 'reduced' : registration?.owner ?? (nativeMotion === 'disable' ? 'disabled' : 'native')
        element.dataset.loomMotionPhase = phase
        if (reduced) {
          for (const animation of element.getAnimations()) animation.cancel()
          return
        }
        let finished: Promise<unknown>
        if (registration) {
          const existing = new Set(element.getAnimations())
          cancel = () => {
            for (const animation of element.getAnimations()) if (!existing.has(animation)) animation.cancel()
          }
          const animation = registration.handler({ element, phase, signal: controller.signal })
          cancel = () => animation.cancel()
          finished = animation.finished
        } else {
          const animations = element.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
          cancel = () => { for (const animation of animations) animation.cancel() }
          finished = Promise.all(animations.map(animation => animation.finished))
        }
        const interrupted = new Promise<void>(resolve => {
          onAbort = () => resolve()
          controller.signal.addEventListener('abort', onAbort, { once: true })
          if (controller.signal.aborted) resolve()
          // ponytail: Extension promises may never settle. Bound panel retention until the SDK supports an enforceable duration contract.
          timer = setTimeout(() => {
            console.warn('[style-motion] Animation exceeded lifecycle deadline', { owner: registration?.owner, phase })
            controller.abort()
          }, 10_000)
        })
        await Promise.race([finished, interrupted])
      } catch (error) {
        if (!controller.signal.aborted) console.warn('[style-motion] Animation failed', error)
      } finally {
        clearTimeout(timer)
        controller.signal.removeEventListener('abort', onAbort)
        signal.removeEventListener('abort', abort)
        try { cancel() } catch (error) { console.warn('[style-motion] Animation cleanup failed', error) }
        if (running.get(element) === controller) {
          running.delete(element)
          delete element.dataset.loomMotionPhase
          // Keep ownership until the next transition so removing the marker cannot restart native CSS effects.
        }
      }
    },
  }
}

export const styleMotion = createStyleMotion()

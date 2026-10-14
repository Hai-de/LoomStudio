let source: EventSource | undefined
let subscribers = 0

/** One transport per page; each consumer owns only its listeners. */
export function subscribeExtensionEvents(options: {
  onConnected?: () => void
  onError?: () => void
  events?: Record<string, (event: MessageEvent) => void>
}): () => void {
  const events = source ??= new EventSource('/extensions/events')
  subscribers++
  let active = true
  const listeners: Array<[string, EventListener]> = []
  const listen = (name: string, listener: EventListener) => {
    events.addEventListener(name, listener)
    listeners.push([name, listener])
  }
  if (options.onConnected) listen('open', options.onConnected)
  if (options.onError) listen('error', options.onError)
  for (const [name, listener] of Object.entries(options.events ?? {})) {
    // Native EventTarget dispatch isolates exceptions between consumers.
    listen(name, listener as EventListener)
  }
  if (events.readyState === EventSource.OPEN) {
    queueMicrotask(() => {
      if (active && events.readyState === EventSource.OPEN) options.onConnected?.()
    })
  }
  return () => {
    if (!active) return
    active = false
    for (const [name, listener] of listeners) events.removeEventListener(name, listener)
    if (--subscribers === 0) {
      events.close()
      source = undefined
    }
  }
}

if (import.meta.hot) import.meta.hot.dispose(() => source?.close())

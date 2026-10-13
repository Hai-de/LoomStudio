import { useEffect, useMemo, useRef, useState } from 'react'

export const startupAreas = ['cards', 'sessions', 'providers', 'tools', 'network'] as const
export type StartupArea = typeof startupAreas[number]
type LoadState = { status: 'loading' | 'ready' | 'error'; error?: Error }
type StartupInput = { source: object } & Record<StartupArea, () => Promise<unknown>>

// Each directory owns its own readiness; none is a prerequisite for opening an existing Timeline.
export function useStudioStartup(input: StartupInput) {
  const sourceRef = useRef({ api: input.source, active: true, requests: new Map<StartupArea, Promise<void>>() })
  if (sourceRef.current.api !== input.source) {
    sourceRef.current.active = false
    sourceRef.current = { api: input.source, active: true, requests: new Map() }
  }
  const source = sourceRef.current
  const [snapshot, setSnapshot] = useState<{ source: typeof source; areas: Partial<Record<StartupArea, LoadState>> }>()
  const areas = snapshot?.source === source ? snapshot.areas : {}

  function publish(area: StartupArea, state: LoadState) {
    if (!source.active || sourceRef.current !== source) return
    setSnapshot(current => ({ source, areas: { ...(current?.source === source ? current.areas : {}), [area]: state } }))
  }

  function retry(area: StartupArea): Promise<void> {
    if (!source.active || sourceRef.current !== source) return Promise.resolve()
    const pending = source.requests.get(area)
    if (pending) return pending
    publish(area, { status: 'loading' })
    const request = Promise.resolve().then(() => input[area]()).then(
      () => publish(area, { status: 'ready' }),
      error => publish(area, { status: 'error', error: error instanceof Error ? error : new Error(String(error)) }),
    ).finally(() => { source.requests.delete(area) })
    source.requests.set(area, request)
    return request
  }

  useEffect(() => {
    source.active = true
    for (const area of startupAreas) void retry(area)
    return () => { source.active = false }
  }, [source])

  const failures = useMemo(() => startupAreas.flatMap(area => areas[area]?.error ? [{ area, error: areas[area]!.error! }] : []), [snapshot, source])
  return {
    ready: (area: StartupArea) => areas[area]?.status === 'ready',
    failures,
    retry,
  }
}

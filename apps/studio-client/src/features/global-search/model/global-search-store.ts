import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeLocalStorage } from '../../../shared/browser/safe-local-storage.js'
import { globalSearchReducer, INITIAL_GLOBAL_SEARCH_STATE, type GlobalSearchState } from './global-search-model.js'

type SearchStore = {
  byEndpoint: Record<string, GlobalSearchState>
  dispatch(endpoint: string, action: Parameters<typeof globalSearchReducer>[1]): void
}

export const useGlobalSearchStore = create<SearchStore>()(persist((set) => ({
  byEndpoint: {},
  dispatch: (endpoint, action) => set(current => ({ byEndpoint: {
    ...current.byEndpoint,
    [endpoint]: globalSearchReducer(current.byEndpoint[endpoint] ?? INITIAL_GLOBAL_SEARCH_STATE, action),
  } })),
}), {
  name: 'loom-studio-global-search',
  storage: createJSONStorage(() => safeLocalStorage),
  partialize: state => ({ byEndpoint: Object.fromEntries(Object.entries(state.byEndpoint).map(([endpoint, search]) => [endpoint, {
    ...search, mode: 'results', candidateQuery: '',
  }])) }),
  merge: (persisted, current) => {
    const saved = persisted as { byEndpoint?: Record<string, GlobalSearchState> } | undefined
    if (!saved?.byEndpoint || typeof saved.byEndpoint !== 'object') return current
    const byEndpoint: Record<string, GlobalSearchState> = {}
    for (const [endpoint, state] of Object.entries(saved.byEndpoint)) {
      if (!state || typeof state.query !== 'string') continue
      const scope = state.scope
      byEndpoint[endpoint] = {
        ...INITIAL_GLOBAL_SEARCH_STATE, query: state.query.slice(0, 256),
        ...(state.kind && ['card', 'lore', 'preset', 'timeline', 'session'].includes(state.kind) ? { kind: state.kind } : {}),
        ...(scope && ['card', 'resource', 'extension'].includes(scope.kind) && typeof scope.id === 'string' && typeof scope.label === 'string'
          ? { scope: { kind: scope.kind, id: scope.id, label: scope.label } } : {}),
      }
    }
    return { ...current, byEndpoint }
  },
}))

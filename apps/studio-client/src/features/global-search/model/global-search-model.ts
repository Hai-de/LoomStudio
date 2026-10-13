import type { GlobalSearchHit, GlobalSearchKind, SearchScopeOption } from '@loom-studio/shared'
import type { LucideIcon } from 'lucide-react'
import type { Translator } from '../../../shared/i18n/index.js'
import type { StudioPanelId } from '../../../shared/studio-shell/studio-layout-store.js'
import { STUDIO_PANEL_PRESENTATION } from '../../../shared/studio-shell/studio-panel-presentation.js'

export type GlobalSearchMode = 'results' | 'scopes' | 'types'
export type GlobalSearchState = {
  mode: GlobalSearchMode
  query: string
  candidateQuery: string
  scope?: SearchScopeOption
  kind?: GlobalSearchKind
}

export type GlobalSearchAction =
  | { type: 'input'; value: string }
  | { type: 'mode'; mode: GlobalSearchMode }
  | { type: 'scope'; scope?: SearchScopeOption }
  | { type: 'kind'; kind?: GlobalSearchKind }
  | { type: 'clear-filters' }

export const INITIAL_GLOBAL_SEARCH_STATE: GlobalSearchState = {
  mode: 'results', query: '', candidateQuery: '',
}
export const GLOBAL_SEARCH_MAX_QUERY_LENGTH = 256

export function globalSearchReducer(state: GlobalSearchState, action: GlobalSearchAction): GlobalSearchState {
  switch (action.type) {
    case 'input': {
      const value = action.value.slice(0, GLOBAL_SEARCH_MAX_QUERY_LENGTH)
      const token = /^(in|type):\s*([\s\S]*)$/i.exec(value.trimStart())
      if (token) return {
        ...state,
        mode: token[1].toLowerCase() === 'in' ? 'scopes' : 'types',
        query: state.mode === 'results' ? '' : state.query,
        candidateQuery: token[2],
      }
      return state.mode === 'results'
        ? { ...state, query: value }
        : { ...state, candidateQuery: value }
    }
    case 'mode':
      return { ...state, mode: action.mode, candidateQuery: '' }
    case 'scope':
      return { ...state, scope: action.scope, ...(action.scope ? { mode: 'results' as const, candidateQuery: '' } : {}) }
    case 'kind':
      return { ...state, kind: action.kind, ...(action.kind ? { mode: 'results' as const, candidateQuery: '' } : {}) }
    case 'clear-filters':
      return { ...state, scope: undefined, kind: undefined }
  }
}

export type GlobalSearchNavigationHit = {
  id: string
  panel: StudioPanelId
  title: string
  Icon: LucideIcon
}

const COMMON_PANELS: StudioPanelId[] = ['character', 'resource', 'agent', 'model', 'sessions', 'settings']

export function findGlobalSearchNavigation(input: {
  query: string
  scope?: SearchScopeOption
  kind?: GlobalSearchKind
  t: Translator
}): GlobalSearchNavigationHit[] {
  // Page entries have no resource identity, so resource filters do not apply to them.
  if (input.scope || input.kind) return []
  const query = input.query.trim().toLowerCase()
  const panels = query ? Object.keys(STUDIO_PANEL_PRESENTATION) as StudioPanelId[] : COMMON_PANELS
  return panels
    .filter(panel => panel !== 'preset')
    .map(panel => {
      const presentation = STUDIO_PANEL_PRESENTATION[panel]
      const title = input.t(presentation.labelKey)
      const normalizedTitle = title.toLowerCase()
      const aliases = panel === 'agent'
        ? `${input.t(STUDIO_PANEL_PRESENTATION.preset.labelKey)} ${input.t(STUDIO_PANEL_PRESENTATION.preset.keywordsKey)}`
        : ''
      const keywords = `${input.t(presentation.keywordsKey)} ${aliases}`.toLowerCase()
      const score = !query || normalizedTitle === query ? 0
        : normalizedTitle.includes(query) ? 1
        : keywords.includes(query) ? 2 : -1
      return { hit: { id: `navigation:${panel}`, panel, title, Icon: presentation.Icon }, score }
    })
    .filter(item => item.score >= 0)
    .sort((a, b) => a.score - b.score)
    .map(item => item.hit)
}

const KIND_PANELS: Record<GlobalSearchKind, StudioPanelId> = {
  card: 'character', lore: 'resource', preset: 'agent', timeline: 'sessions', session: 'sessions',
}

export function findGlobalSearchTypes(query: string, t: Translator): Array<{ kind: GlobalSearchKind; label: string }> {
  const normalizedQuery = query.trim().toLowerCase()
  return (Object.keys(KIND_PANELS) as GlobalSearchKind[])
    .map(kind => ({ kind, label: t(`search.kind.${kind}`) }))
    .filter(option => `${option.kind} ${option.label} ${t(STUDIO_PANEL_PRESENTATION[KIND_PANELS[option.kind]].keywordsKey)}`
      .toLowerCase().includes(normalizedQuery))
}

export function globalSearchResourceValue(hit: GlobalSearchHit): string {
  return `resource:${JSON.stringify([hit.kind, hit.id])}`
}

export function globalSearchScopeValue(scope: SearchScopeOption): string {
  return `scope:${JSON.stringify([scope.kind, scope.id])}`
}

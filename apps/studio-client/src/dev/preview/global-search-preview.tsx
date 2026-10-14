import { useReducer, useState } from 'react'
import { Search } from 'lucide-react'
import type { GlobalSearchHit, SearchScopeOption } from '@loom-studio/shared'
import { GlobalSearchDialog } from '../../widgets/global-search/global-search-dialog.js'
import { findGlobalSearchNavigation, findGlobalSearchTypes, globalSearchReducer, INITIAL_GLOBAL_SEARCH_STATE } from '../../features/global-search/model/global-search-model.js'
import { createTranslator } from '../../shared/i18n/index.js'

const t = createTranslator('zh-CN')
const resources: GlobalSearchHit[] = Array.from({ length: 24 }, (_, index) => ({
  id: `preview:${index}`, kind: 'lore', title: index % 2 ? '王都与边境' : '北方诸国与霜月家族的历史',
  path: ['北境世界书', index % 2 ? '地理' : '历史', `条目 ${index + 1}`],
  snippet: '霜月河穿过北境，最终汇入王都东侧的港口。城内的学者保留着上一个王朝的文献与地图。',
  target: { type: 'resource', resourceId: 'preview-lore', nodeId: `entry-${index}`, resourceKind: 'lore' },
  ...(index % 2 ? { source: { packageId: 'official.the-world', installationId: `installation-${index}`, cardId: 'preview-card', cardName: '霜月' } } : {}),
}))
const scopes: SearchScopeOption[] = [
  { kind: 'resource', id: 'worldbook', label: '北境世界书', description: '霜月携带的世界书' },
  { kind: 'card', id: 'card', label: '霜月', description: '携带的预设与世界书、直接关联资源' },
  { kind: 'extension', id: 'extension', label: 'The World', description: '全局与角色卡的安装来源' },
]

export function GlobalSearchPreview() {
  const [open, setOpen] = useState(false)
  const [scenario, setScenario] = useState('normal')
  const [lastOpened, setLastOpened] = useState('')
  const [state, dispatch] = useReducer(globalSearchReducer, INITIAL_GLOBAL_SEARCH_STATE)
  const search = {
    mode: state.mode, query: state.query, inputValue: state.mode === 'results' ? state.query : state.candidateQuery,
    scope: state.scope, kind: state.kind,
    navigation: state.mode === 'results' ? findGlobalSearchNavigation({ query: state.query, scope: state.scope, kind: state.kind, t }) : [],
    results: scenario === 'empty' || scenario === 'loading' ? [] : resources.filter(item => (!state.kind || state.kind === item.kind) && `${item.title} ${item.snippet}`.includes(state.query)),
    scopes: scopes.filter(item => `${item.label} ${item.description}`.includes(state.candidateQuery)),
    types: findGlobalSearchTypes(state.candidateQuery, t), loading: scenario === 'loading', loadingMore: false, hasMore: false,
    diagnostics: [],
    error: scenario === 'error' ? new Error('示例：该范围已被删除，请移除范围后重新搜索。') : null,
    setInputValue: (value: string) => dispatch({ type: 'input', value }),
    showScopes: () => dispatch({ type: 'mode', mode: 'scopes' }), showTypes: () => dispatch({ type: 'mode', mode: 'types' }), showResults: () => dispatch({ type: 'mode', mode: 'results' }),
    selectScope: (scope: SearchScopeOption) => dispatch({ type: 'scope', scope }), selectKind: (kind: NonNullable<typeof state.kind>) => dispatch({ type: 'kind', kind }),
    removeScope: () => dispatch({ type: 'scope' }), removeKind: () => dispatch({ type: 'kind' }), clearFilters: () => dispatch({ type: 'clear-filters' }), loadMore: () => {}, retry: () => setScenario('normal'),
  }
  return <main style={{ padding: 24, minHeight: '100dvh', background: 'var(--loom-color-background)', color: 'var(--loom-color-text)' }}>
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
      <button type="button" aria-label={t('search.open')} onClick={() => setOpen(true)} style={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: 999, border: '1px solid var(--loom-color-border)', background: 'var(--loom-color-surface)', color: 'inherit' }}><Search size={16} /></button>
      <span style={{ borderRadius: 999, padding: '6px 18px', background: 'var(--loom-color-surface)' }}>霜月</span>
    </div>
    <div style={{ marginTop: 40, display: 'flex', gap: 12, alignItems: 'center' }}>
      <label>样例状态 <select value={scenario} onChange={event => setScenario(event.target.value)}><option value="normal">正常 / 多条结果</option><option value="empty">空结果</option><option value="loading">加载</option><option value="error">范围错误</option></select></label>
      <button type="button" onClick={() => { dispatch({ type: 'input', value: '王都' }); setOpen(true) }}>打开搜索样例</button>
    </div>
    <p>输入「王都」、in: 或 type:。选择条目仅记录在此页，不调用业务接口。</p>
    {lastOpened ? <p>已选择：{lastOpened}</p> : null}
    <GlobalSearchDialog open={open} search={search} recent={resources.slice(0, 2)} t={t} onClose={() => setOpen(false)}
      onOpenPanel={panel => { setLastOpened(panel); setOpen(false) }} onOpenResult={hit => { setLastOpened(`${hit.title} / ${hit.target.type}`); setOpen(false) }} />
  </main>
}

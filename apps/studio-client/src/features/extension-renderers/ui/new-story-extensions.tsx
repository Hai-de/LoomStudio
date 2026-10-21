import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Dialog } from '@loom-studio/ui'
import { extensionInstallationId } from '@loom-studio/extension-sdk'
import type { StudioApi } from '../../../shared/api/studio-api.js'
import styles from './timeline-extension-panel.module.scss'

type Selection = Array<{ packageId: string; target: 'global' | 'card' }>
type Candidate = Selection[number] & { id: string; name: string; selected: boolean; issue?: string }
type Prompt = { source: StudioApi; cardId: string; name: string; candidates: Candidate[]; loading: boolean; error?: string }

/** One request per creation; the selection belongs to the new story, not the Card editor. */
export function useNewStoryExtensions(api: StudioApi) {
  const [prompt, setPrompt] = useState<Prompt>()
  const pending = useRef<{ resolve(value: Selection | undefined): void } | undefined>(undefined)
  const finish = useCallback((value: Selection | undefined) => {
    const request = pending.current
    pending.current = undefined
    setPrompt(undefined)
    request?.resolve(value)
  }, [])
  useEffect(() => () => {
    pending.current?.resolve(undefined)
    pending.current = undefined
  }, [api])

  const choose = useCallback((cardId: string): Promise<Selection | undefined> => {
    pending.current?.resolve(undefined)
    setPrompt({ source: api, cardId, name: '', candidates: [], loading: true })
    return new Promise(resolve => {
      const request = { resolve }
      pending.current = request
      void Promise.all([
        api.cards.get(cardId), api.extensions.list(), api.extensions.list({ kind: 'card', cardId }),
        api.extensionInstallations.list(),
      ]).then(([{ card }, global, local, { installations }]) => {
        if (pending.current !== request) return
        const candidates = [...global.items, ...local.items].filter(pkg => pkg.participation === 'timeline').map(pkg => {
          const target = pkg.target ?? { kind: 'global' as const }
          const id = extensionInstallationId(pkg.packageId, target)
          const installation = installations.find(item => item.id === id)
          const enabled = pkg.modules.some(module => module.desired.enabled)
          const issue = !pkg.available ? '扩展文件不可用'
            : !enabled ? '尚未启用，请先在扩展列表启用'
              : !installation || installation.participation !== 'timeline' || installation.packageVersion !== pkg.version
                ? '安装记录待更新，请先在扩展列表更新资源' : undefined
          return { id, packageId: pkg.packageId, target: target.kind, name: pkg.displayName, selected: enabled && !issue, issue }
        })
        setPrompt({ source: api, cardId, name: card.name, candidates, loading: false })
      }, error => {
        if (pending.current === request) setPrompt({ source: api, cardId, name: '', candidates: [], loading: false,
          error: error instanceof Error ? error.message : String(error) })
      })
    })
  }, [api])

  const dialog = prompt?.source === api ? <Dialog open title="开始新叙事" onClose={() => finish(undefined)}
    description={`${prompt.name || '当前角色'} · 已启用的故事扩展默认选中，可为本次叙事调整。`}
    actions={<>
      <Button variant="ghost" onClick={() => finish(undefined)}>取消</Button>
      <Button disabled={prompt.loading || Boolean(prompt.error)} onClick={() => finish(prompt.candidates
        .filter(item => item.selected && !item.issue).map(({ packageId, target }) => ({ packageId, target })))}>开始叙事</Button>
    </>}>
    {prompt.loading ? <p role="status">正在读取可用扩展……</p> : prompt.error ? <p role="alert" className={styles.error}>{prompt.error}</p>
      : prompt.candidates.length ? <ul className={styles.list}>{prompt.candidates.map(item => <li key={item.id} className={styles.choiceRow}>
        <Checkbox checked={item.selected} disabled={Boolean(item.issue)} label={<span className={styles.identity}>
          <strong>{item.name}</strong><small>{item.issue ?? (item.target === 'card' ? '随角色安装' : '工作区安装')}</small>
        </span>} onChange={event => {
          const selected = event.currentTarget.checked
          setPrompt(current => current ? { ...current, candidates: current.candidates.map(candidate => candidate.id === item.id ? { ...candidate, selected } : candidate) } : current)
        }} />
      </li>)}</ul> : <p>没有需要随故事运行的扩展，可以直接开始。</p>}
    <p className={styles.hint}>确认后会初始化所选扩展的数据。当前故事、历史记录和角色默认设置不受影响。</p>
  </Dialog> : null
  return { choose, dialog }
}

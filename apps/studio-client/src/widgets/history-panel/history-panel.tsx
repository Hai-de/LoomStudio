import { useEffect, useState, type ReactNode } from 'react'
import type { Translator } from '../../shared/i18n/index.js'
import { PanelTabs } from '../../shared/ui/panel-tabs/index.js'
import styles from './history-panel.module.scss'

export type HistoryTab = 'recent' | 'timelines' | 'sessions'

export function HistoryPanel(props: {
  tab: HistoryTab
  onTabChange(tab: HistoryTab): void
  recent: ReactNode
  history(view: 'timelines' | 'sessions'): ReactNode
  t: Translator
}) {
  const [lastView, setLastView] = useState<'timelines' | 'sessions' | undefined>(props.tab === 'recent' ? undefined : props.tab)
  useEffect(() => { if (props.tab !== 'recent') setLastView(props.tab) }, [props.tab])
  const view = props.tab === 'recent' ? lastView : props.tab

  return <section className={styles.panel} aria-label={props.t('rail.recent')}>
    <div className={styles.tabs}>
      <PanelTabs activeId={props.tab} onChange={props.onTabChange} ariaLabel={props.t('rail.recent')} items={[
        { id: 'recent', label: props.t('history.tabRecent') },
        { id: 'timelines', label: props.t('history.tabTimelines') },
        { id: 'sessions', label: props.t('history.tabSessions') },
      ]} />
    </div>
    <div className={styles.content} hidden={props.tab !== 'recent'}>{props.recent}</div>
    {view ? <div className={styles.content} hidden={props.tab === 'recent'}>{props.history(view)}</div> : null}
  </section>
}

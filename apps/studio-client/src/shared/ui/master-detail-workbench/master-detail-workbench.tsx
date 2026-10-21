import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { WindowColumnLayout, type WindowColumnDefinition } from '../window-column-layout/window-column-layout.js'
import { useStudioLayoutStore } from '../../studio-shell/studio-layout-store.js'
import styles from './master-detail-workbench.module.scss'

const NARROW_BREAKPOINT = 640

export type MasterDetailWorkbenchProps = {
  master: ReactNode
  children: ReactNode
  mobilePane?: 'master' | 'detail'
  onMobilePaneChange?: (pane: 'master' | 'detail') => void
  onBack?: () => void
  backLabel?: string
  className?: string
  masterWidth?: number | string
  defaultMasterWidth?: number
  onMasterWidthChange?: (width: number) => void
  masterMinWidth?: number
  detailMinWidth?: number
  resizeLabel?: string
  dataComponent?: string
  drilldown?: boolean
  hasSelection?: boolean
  hideBackBar?: boolean
  navigationScope?: 'workspace' | 'local'
}

export function MasterDetailWorkbench(props: MasterDetailWorkbenchProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNarrow, setIsNarrow] = useState(false)
  const [internalMobilePane, setInternalMobilePane] = useState<'master' | 'detail'>('master')

  const [internalMasterWidth, setInternalMasterWidth] = useState(
    typeof props.masterWidth === 'number' ? props.masterWidth : props.defaultMasterWidth ?? 280,
  )

  // A supplied pane is controlled by the parent; otherwise this workbench owns mobile navigation locally.
  const mobilePane = props.mobilePane ?? internalMobilePane
  const setMobilePane = props.onMobilePaneChange ?? setInternalMobilePane
  const setWorkbenchNavigation = useStudioLayoutStore(state => state.setWorkbenchNavigation)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateNarrow = () => {
      const nextNarrow = el.clientWidth > 0 && el.clientWidth < NARROW_BREAKPOINT
      setIsNarrow(prev => (prev === nextNarrow ? prev : nextNarrow))
    }
    updateNarrow()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(updateNarrow)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const singlePane = isNarrow || props.drilldown === true
  const showDetailOnly = singlePane && mobilePane === 'detail' && props.hasSelection !== false

  const forwardAvailableRef = useRef(false)
  const showDetailOnlyRef = useRef(showDetailOnly)
  showDetailOnlyRef.current = showDetailOnly

  const handleGoBack = useCallback(() => {
    if (showDetailOnlyRef.current) {
      forwardAvailableRef.current = true
      setMobilePane('master')
      props.onBack?.()
      return true
    }
    return false
  }, [setMobilePane, props.onBack])

  const handleGoForward = useCallback(() => {
    if (forwardAvailableRef.current) {
      forwardAvailableRef.current = false
      setMobilePane('detail')
      return true
    }
    return false
  }, [setMobilePane])

  useEffect(() => {
    if (mobilePane === 'detail') {
      forwardAvailableRef.current = false
    }
  }, [mobilePane])

  useEffect(() => {
    if (props.navigationScope === 'local') return
    const nav = {
      canGoBack: () => showDetailOnlyRef.current,
      goBack: handleGoBack,
      canGoForward: () => forwardAvailableRef.current,
      goForward: handleGoForward,
    }
    setWorkbenchNavigation(nav)
    return () => {
      setWorkbenchNavigation(null)
    }
  }, [handleGoBack, handleGoForward, setWorkbenchNavigation, props.navigationScope])

  const currentMasterWidth = typeof props.masterWidth === 'number' ? props.masterWidth : internalMasterWidth

  function handleMasterWidthChange(size: number) {
    setInternalMasterWidth(size)
    props.onMasterWidthChange?.(size)
  }

  const masterPane = (
    <aside className={styles.masterPane} data-loom-slot="master" inert={singlePane && showDetailOnly}>
      {props.master}
    </aside>
  )

  const detailPane = (
    <section className={styles.detailPane} data-loom-slot="detail" inert={singlePane && !showDetailOnly}>
      {singlePane && (props.hideBackBar ?? props.navigationScope !== 'local') === false ? (
        <div className={styles.narrowBackBar}>
          <button
            className={styles.narrowBackButton}
            type="button"
            onClick={() => {
              setMobilePane('master')
              props.onBack?.()
            }}
            aria-label={props.backLabel ?? '返回列表'}
          >
            <ChevronLeft aria-hidden="true" size={16} />
            <span>{props.backLabel ?? '返回列表'}</span>
          </button>
        </div>
      ) : null}
      <div className={styles.detailBody}>
        {props.children}
      </div>
    </section>
  )

  const columns: WindowColumnDefinition[] = [
        {
          content: masterPane,
          id: 'master',
          minSize: props.masterMinWidth ?? 180,
          resizeLabel: singlePane ? undefined : props.resizeLabel ?? '调整侧栏宽度',
          size: currentMasterWidth,
        },
        {
          content: detailPane,
          fill: true,
          id: 'detail',
          minSize: props.detailMinWidth ?? 200,
        },
      ]

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${props.className ?? ''}`}
      data-loom-component={props.dataComponent ?? 'master-detail-workbench'}
      data-single-pane={singlePane}
      data-pane={showDetailOnly ? 'detail' : 'master'}
    >
      <WindowColumnLayout
          className={styles.workbenchColumnLayout}
          columns={columns}
          onColumnSizeChange={(columnId, size) => {
            if (columnId === 'master') handleMasterWidthChange(size)
          }}
      />
    </div>
  )
}

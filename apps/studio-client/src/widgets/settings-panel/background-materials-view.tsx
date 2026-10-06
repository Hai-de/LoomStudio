import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Eye, ImageOff, X } from 'lucide-react'
import { Button, Dialog, IconButton, SearchField } from '@loom-studio/ui'
import styles from './background-materials-view.module.scss'

export type BackgroundOption = {
  scope?: { cardId: string; ownerKey: string }
  id: string
  name: string
  description: string
  source: string
  image: string
}

export type MaterialValue = {
  mode: 'solid' | 'translucent' | 'glass'
  blur: number
  opacity: number
}

type AppearancePage = 'background' | 'material' | 'general'

export function BackgroundMaterialsView(props: {
  backgrounds: readonly BackgroundOption[]
  selectedId: string | null
  followState: boolean
  material: MaterialValue
  general?: ReactNode
  onSelect(id: string | null): void
  onFollowStateChange(value: boolean): void
  onMaterialChange(value: MaterialValue): void
}) {
  const [page, setPage] = useState<AppearancePage>('background')
  const [query, setQuery] = useState('')
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'image' | 'material'>('image')
  const tabId = useId()
  const current = props.backgrounds.find(item => item.id === props.selectedId)
  const preview = props.backgrounds.find(item => item.id === previewId)
  const visible = props.backgrounds.filter(item => `${item.name} ${item.description} ${item.source}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const pages: { id: AppearancePage; label: string }[] = [
    { id: 'background', label: '背景' },
    { id: 'material', label: '材质' },
    ...(props.general ? [{ id: 'general' as const, label: '缩放与 CSS' }] : []),
  ]
  const modes = { solid: '实色', translucent: '半透明', glass: '毛玻璃' } as const

  return (
    <section className={styles.view} data-loom-component="background-materials-view">
      <div className={styles.tabs} role="tablist" aria-label="外观">
        {pages.map((item, index) => (
          <button
            aria-controls={`${tabId}-panel`}
            aria-selected={page === item.id}
            id={`${tabId}-${item.id}`}
            key={item.id}
            role="tab"
            tabIndex={page === item.id ? 0 : -1}
            type="button"
            onClick={() => setPage(item.id)}
            onKeyDown={event => {
              let next: number
              if (event.key === 'ArrowRight') next = (index + 1) % pages.length
              else if (event.key === 'ArrowLeft') next = (index + pages.length - 1) % pages.length
              else if (event.key === 'Home') next = 0
              else if (event.key === 'End') next = pages.length - 1
              else return
              event.preventDefault()
              setPage(pages[next].id)
              const buttons = event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]')
              buttons[next].focus()
            }}
          >{item.label}</button>
        ))}
      </div>
      <div aria-labelledby={`${tabId}-${page}`} id={`${tabId}-panel`} role="tabpanel">
        {page === 'general' ? props.general : (
          <div>
            <div className={styles.controls}>
              {page === 'background' ? (
                <>
                  <label className={styles.switchRow}>
                    <span>跟随 AI 场景切换</span>
                    <input type="checkbox" role="switch" checked={props.followState} onChange={event => props.onFollowStateChange(event.target.checked)} />
                  </label>
                  <SearchField containerClassName={styles.search} aria-label="搜索背景" placeholder="搜索名称、描述或来源"
                    clearLabel="清空搜索" value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} />
                  <div className={styles.resourceHeader}>
                    <span>{visible.length} 个背景</span>
                    <Button aria-pressed={props.selectedId === null} onClick={() => props.onSelect(null)}>
                      <ImageOff aria-hidden="true" size={15} />不使用人工背景
                    </Button>
                  </div>
                  <div className={styles.grid}>
                    {visible.map(item => (
                      <article className={styles.card} key={item.id} data-selected={props.selectedId === item.id}>
                        <button className={styles.selectCard} aria-label={`选择背景：${item.name}`}
                          aria-pressed={props.selectedId === item.id} type="button" onClick={() => props.onSelect(item.id)}>
                          <span className={styles.thumbnail}>
                            <img alt="" src={item.image} loading="lazy" />
                            {props.selectedId === item.id ? <span className={styles.selected}><Check aria-hidden="true" size={14} /></span> : null}
                          </span>
                          <span className={styles.cardText}>
                            <strong title={item.name}>{item.name}</strong>
                            <span title={item.description}>{item.description === item.name ? '' : item.description}</span>
                          </span>
                        </button>
                        <div className={styles.cardFooter}>
                          <small title={item.source}>{item.source}</small>
                          <IconButton aria-label={`预览背景：${item.name}`} onClick={() => { setPreviewId(item.id); setPreviewMode('image') }}>
                            <Eye aria-hidden="true" size={16} />
                          </IconButton>
                        </div>
                      </article>
                    ))}
                  </div>
                  {visible.length === 0 ? <p className={styles.empty}>{query ? '没有匹配的背景' : '暂无可用背景'}</p> : null}
                </>
              ) : (
                <>
                  <fieldset className={styles.modeChoices}>
                    <legend>表面模式</legend>
                    {(['solid', 'translucent', 'glass'] as const).map(mode => (
                      <label key={mode}>
                        <input name={`${tabId}-mode`} type="radio" checked={props.material.mode === mode} onChange={() => props.onMaterialChange({ ...props.material, mode })} />
                        {modes[mode]}
                      </label>
                    ))}
                  </fieldset>
                  <label className={styles.range}>
                    <span>模糊强度 <output>{props.material.blur}px</output></span>
                    <input aria-label="模糊强度" disabled={props.material.mode !== 'glass'} max={32} min={0} type="range" value={props.material.blur} onChange={event => props.onMaterialChange({ ...props.material, blur: Number(event.target.value) })} />
                  </label>
                  <label className={styles.range}>
                    <span>表面不透明度 <output>{props.material.opacity}%</output></span>
                    <input aria-label="表面不透明度" disabled={props.material.mode === 'solid'} max={100} min={0} type="range" value={props.material.opacity} onChange={event => props.onMaterialChange({ ...props.material, opacity: Number(event.target.value) })} />
                  </label>
                  <Button disabled={!current} onClick={() => { setPreviewId(current!.id); setPreviewMode('material') }}>
                    <Eye aria-hidden="true" size={16} />预览材质
                  </Button>
                  {!current ? <p className={styles.note}>当前未选择背景</p> : null}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <Dialog open={!!preview} onClose={() => setPreviewId(null)} closeOnBackdrop
        className={styles.previewDialog} title={preview?.name ?? '背景预览'}
        headerActions={<IconButton aria-label="关闭预览" onClick={() => setPreviewId(null)}><X aria-hidden="true" size={18} /></IconButton>}
        actions={preview ? <Button disabled={props.selectedId === preview.id} onClick={() => { props.onSelect(preview.id); setPreviewId(null) }}>
          <Check aria-hidden="true" size={16} />{props.selectedId === preview.id ? '已使用' : '使用此背景'}
        </Button> : undefined}>
        {preview ? (
          <>
            <div className={styles.previewModes} role="group" aria-label="预览模式">
              <Button aria-pressed={previewMode === 'image'} onClick={() => setPreviewMode('image')}>原图</Button>
              <Button aria-pressed={previewMode === 'material'} onClick={() => setPreviewMode('material')}>材质效果</Button>
            </div>
            {previewMode === 'image'
              ? <img className={styles.fullImage} src={preview.image} alt={preview.name} />
              : <MaterialScene background={preview} material={props.material} />}
            <div className={styles.previewMeta}>
              <span>{preview.source}</span>
              {preview.description !== preview.name ? <p>{preview.description}</p> : null}
            </div>
          </>
        ) : null}
      </Dialog>
    </section>
  )
}

function MaterialScene(props: { background?: BackgroundOption; material: MaterialValue }) {
  const glass = props.material.mode === 'glass'
  const variables = {
    '--loom-material-blur': `${glass ? props.material.blur : 0}px`,
    '--loom-material-fill-opacity': `${props.material.mode === 'solid' ? 100 : props.material.opacity}%`,
    '--loom-solid-fade-display': glass ? 'none' : 'block',
  } as CSSProperties

  return (
    <div className={styles.scene} data-material-mode={props.material.mode} style={variables}>
      {props.background ? <img alt="" className={styles.sceneBackground} src={props.background.image} /> : null}
      <div className={styles.sceneContent}>
        <header className={styles.material}>Loom Studio</header>
        <div className={styles.reading}>
          <p>沿着河岸向前走，远处的灯光在水面轻轻摇晃。</p>
          <article className={styles.material}>
            <strong>旅途手记</strong>
            <div className={styles.scrollText}>
              <p>远方的钟声穿过街巷，人群渐渐散去。</p>
              <p>你停下脚步，将今天的见闻记在了手册里。</p>
            </div>
          </article>
        </div>
        <footer className={styles.material}>继续你的故事…</footer>
      </div>
    </div>
  )
}

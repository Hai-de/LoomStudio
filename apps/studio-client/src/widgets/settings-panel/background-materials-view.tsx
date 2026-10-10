import { useId, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Eye, ImageOff, X } from 'lucide-react'
import { Button, Dialog, IconButton, SearchField } from '@loom-studio/ui'
import type { Translator } from '../../shared/i18n/index.js'
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
  t: Translator
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
    { id: 'background', label: props.t('appearance.background') },
    { id: 'material', label: props.t('appearance.material') },
    ...(props.general ? [{ id: 'general' as const, label: props.t('appearance.general') }] : []),
  ]
  const modes = { solid: props.t('appearance.solid'), translucent: props.t('appearance.translucent'), glass: props.t('appearance.glass') }

  return (
    <section className={styles.view} data-loom-component="background-materials-view">
      <div className={styles.tabs} role="tablist" aria-label={props.t('settings.appearance')}>
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
                    <span>{props.t('appearance.followScene')}</span>
                    <input type="checkbox" role="switch" checked={props.followState} onChange={event => props.onFollowStateChange(event.target.checked)} />
                  </label>
                  <SearchField containerClassName={styles.search} aria-label={props.t('appearance.search')} placeholder={props.t('appearance.searchPlaceholder')}
                    clearLabel={props.t('agent.clearSearch')} value={query} onChange={event => setQuery(event.target.value)} onClear={() => setQuery('')} />
                  <div className={styles.resourceHeader}>
                    <span>{props.t('appearance.count', { count: visible.length })}</span>
                    <Button aria-pressed={props.selectedId === null} onClick={() => props.onSelect(null)}>
                      <ImageOff aria-hidden="true" size={15} />{props.t('appearance.noManualBackground')}
                    </Button>
                  </div>
                  <div className={styles.grid}>
                    {visible.map(item => (
                      <article className={styles.card} key={item.id} data-selected={props.selectedId === item.id}>
                        <button className={styles.selectCard} aria-label={props.t('appearance.selectNamed', { name: item.name })}
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
                          <IconButton aria-label={props.t('appearance.previewNamed', { name: item.name })} onClick={() => { setPreviewId(item.id); setPreviewMode('image') }}>
                            <Eye aria-hidden="true" size={16} />
                          </IconButton>
                        </div>
                      </article>
                    ))}
                  </div>
                  {visible.length === 0 ? <p className={styles.empty}>{props.t(query ? 'appearance.noMatches' : 'appearance.empty')}</p> : null}
                </>
              ) : (
                <>
                  <fieldset className={styles.modeChoices}>
                    <legend>{props.t('appearance.surfaceMode')}</legend>
                    {(['solid', 'translucent', 'glass'] as const).map(mode => (
                      <label key={mode}>
                        <input name={`${tabId}-mode`} type="radio" checked={props.material.mode === mode} onChange={() => props.onMaterialChange({ ...props.material, mode })} />
                        {modes[mode]}
                      </label>
                    ))}
                  </fieldset>
                  <label className={styles.range}>
                    <span>{props.t('appearance.blur')} <output>{props.material.blur}px</output></span>
                    <input aria-label={props.t('appearance.blur')} disabled={props.material.mode !== 'glass'} max={32} min={0} type="range" value={props.material.blur} onChange={event => props.onMaterialChange({ ...props.material, blur: Number(event.target.value) })} />
                  </label>
                  <label className={styles.range}>
                    <span>{props.t('appearance.opacity')} <output>{props.material.opacity}%</output></span>
                    <input aria-label={props.t('appearance.opacity')} disabled={props.material.mode === 'solid'} max={100} min={0} type="range" value={props.material.opacity} onChange={event => props.onMaterialChange({ ...props.material, opacity: Number(event.target.value) })} />
                  </label>
                  <Button disabled={!current} onClick={() => { setPreviewId(current!.id); setPreviewMode('material') }}>
                    <Eye aria-hidden="true" size={16} />{props.t('appearance.previewMaterial')}
                  </Button>
                  {!current ? <p className={styles.note}>{props.t('appearance.unselected')}</p> : null}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <Dialog open={!!preview} onClose={() => setPreviewId(null)} closeOnBackdrop
        className={styles.previewDialog} title={preview?.name ?? props.t('appearance.preview')}
        headerActions={<IconButton aria-label={props.t('appearance.closePreview')} onClick={() => setPreviewId(null)}><X aria-hidden="true" size={18} /></IconButton>}
        actions={preview ? <Button disabled={props.selectedId === preview.id} onClick={() => { props.onSelect(preview.id); setPreviewId(null) }}>
          <Check aria-hidden="true" size={16} />{props.t(props.selectedId === preview.id ? 'appearance.selected' : 'appearance.useBackground')}
        </Button> : undefined}>
        {preview ? (
          <>
            <div className={styles.previewModes} role="group" aria-label={props.t('appearance.previewMode')}>
              <Button aria-pressed={previewMode === 'image'} onClick={() => setPreviewMode('image')}>{props.t('appearance.original')}</Button>
              <Button aria-pressed={previewMode === 'material'} onClick={() => setPreviewMode('material')}>{props.t('appearance.materialEffect')}</Button>
            </div>
            {previewMode === 'image'
              ? <img className={styles.fullImage} src={preview.image} alt={preview.name} />
              : <MaterialScene background={preview} material={props.material} t={props.t} />}
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

function MaterialScene(props: { background?: BackgroundOption; material: MaterialValue; t: Translator }) {
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
          <p>{props.t('appearance.sampleIntro')}</p>
          <article className={styles.material}>
            <strong>{props.t('appearance.sampleTitle')}</strong>
            <div className={styles.scrollText}>
              <p>{props.t('appearance.sampleBody')}</p>
              <p>{props.t('appearance.sampleEnd')}</p>
            </div>
          </article>
        </div>
        <footer className={styles.material}>{props.t('appearance.sampleContinue')}</footer>
      </div>
    </div>
  )
}

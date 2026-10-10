import { useEffect, useState, type FormEvent } from 'react'
import { ExternalLink, Globe, Info, Network, Palette, Save } from 'lucide-react'
import { Button } from '@loom-studio/ui'
import type { NetworkSettings } from '../../shared/api/studio-api.js'
import type { Locale, Translator } from '../../shared/i18n/index.js'
import { localeLabels, supportedLocales } from '../../shared/i18n/index.js'
import { MasterDetailWorkbench } from '../../shared/ui/master-detail-workbench/master-detail-workbench.js'
import { useMotionPreferenceStore, type MotionPreference } from '../../shared/hooks/use-motion-preference.js'
import { useAppearanceStore } from '../../shared/studio-shell/appearance-store.js'
import { useTokenDisplaySettings } from '../../shared/tokenizer/settings.js'
import { BackgroundMaterialsView, type BackgroundOption } from './background-materials-view.js'
import styles from './settings-panel.module.scss'

type SettingsCategory = 'general' | 'network' | 'appearance' | 'about'

export function resolveNetworkSettingsPayload(
  proxyMode: NetworkSettings['proxyMode'],
  proxyUrl?: string,
): { proxyMode: NetworkSettings['proxyMode']; proxyUrl?: string } {
  return {
    proxyMode,
    ...(proxyMode === 'manual' ? { proxyUrl } : {}),
  }
}

export function SettingsPanel(props: {
  busy: boolean
  customCss: string
  locale: Locale
  networkSettings: NetworkSettings
  backgrounds?: readonly BackgroundOption[]
  backgroundCardId?: string
  uiScale: number
  onChangeCustomCss(value: string): void
  onChangeLocale(locale: Locale): void
  onChangeUiScale(value: number): void
  onUpdateNetworkSettings(value: { proxyMode: NetworkSettings['proxyMode']; proxyUrl?: string }): void
  t: Translator
}) {
  const [category, setCategory] = useState<SettingsCategory>('general')
  const [mobilePane, setMobilePane] = useState<'master' | 'detail'>('master')
  const [proxyMode, setProxyMode] = useState(props.networkSettings.proxyMode)
  const [proxyUrl, setProxyUrl] = useState(props.networkSettings.proxyUrl ?? '')
  const tokenMultiplier = useTokenDisplaySettings(state => state.multiplier)
  const setTokenMultiplier = useTokenDisplaySettings(state => state.setMultiplier)
  const previewBackgroundId = useAppearanceStore(state => state.scopedBackground && state.scopedBackground.cardId === props.backgroundCardId
    ? state.scopedBackground.id : state.background?.id ?? null)
  const previewFollowState = useAppearanceStore(state => state.followAI)
  const previewMaterial = useAppearanceStore(state => state.material)
  const previewCanvasWidth = useAppearanceStore(state => state.canvasWidth ?? 720)
  const setPreviewBackground = useAppearanceStore(state => state.setBackground)
  const setScopedBackground = useAppearanceStore(state => state.setScopedBackground)
  const setPreviewFollowState = useAppearanceStore(state => state.setFollowAI)
  const setPreviewMaterial = useAppearanceStore(state => state.setMaterial)
  const setPreviewCanvasWidth = useAppearanceStore(state => state.setCanvasWidth)
  const narrativeOverscan = useAppearanceStore(state => state.narrativeOverscan)
  const setNarrativeOverscan = useAppearanceStore(state => state.setNarrativeOverscan)
  const motionPreference = useMotionPreferenceStore(state => state.preference)
  const setMotionPreference = useMotionPreferenceStore(state => state.setPreference)
  const backgrounds = props.backgrounds ?? []
  const categories = [
    { id: 'general', label: props.t('settings.general'), icon: Globe },
    { id: 'network', label: props.t('settings.network'), icon: Network },
    { id: 'appearance', label: props.t('settings.appearance'), icon: Palette },
    { id: 'about', label: props.t('settings.about'), icon: Info },
  ] as const

  useEffect(() => {
    setProxyMode(props.networkSettings.proxyMode)
    setProxyUrl(props.networkSettings.proxyUrl ?? '')
  }, [props.networkSettings.proxyMode, props.networkSettings.proxyUrl])

  function saveNetworkSettings(event: FormEvent) {
    event.preventDefault()
    props.onUpdateNetworkSettings(resolveNetworkSettingsPayload(proxyMode, proxyUrl))
  }

  return (
    <section className={styles.settingsPanel} data-loom-component="settings-panel">
      <MasterDetailWorkbench
        className={styles.workbench}
        defaultMasterWidth={200}
        masterMinWidth={160}
        backLabel={props.t('settings.back')}
        mobilePane={mobilePane}
        onMobilePaneChange={setMobilePane}
        master={(
          <nav aria-label={props.t('settings.categories')} className={styles.masterNav}>
            {categories.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-current={category === id ? 'page' : undefined}
                className={styles.navItem}
                type="button"
                onClick={() => { setCategory(id); setMobilePane('detail') }}
              >
                <Icon aria-hidden="true" size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        )}
      >
        <div className={styles.detailPane}>
          <header className={styles.detailHeader}>
            <h3>{categories.find(item => item.id === category)?.label}</h3>
          </header>
          {category === 'general' ? (
            <>
              <section className={styles.settingSection}>
                <label className={styles.settingRow}>
                  <span>{props.t('app.localeLabel')}</span>
                  <select value={props.locale} onChange={event => props.onChangeLocale(event.target.value as Locale)}>
                    {supportedLocales.map(locale => <option key={locale} value={locale}>{localeLabels[locale]}</option>)}
                  </select>
                </label>
              </section>
              <section className={styles.settingSection}>
                <label className={styles.settingRow} title={props.t('tokens.displayMultiplierHelp')}>
                  <span>{props.t('tokens.displayMultiplier')}</span>
                  <input aria-label={props.t('tokens.displayMultiplier')} type="number" min="0.01" step="0.05"
                    value={tokenMultiplier} onChange={event => {
                      const value = event.currentTarget.valueAsNumber
                      if (Number.isFinite(value) && value > 0) setTokenMultiplier(value)
                    }} />
                </label>
              </section>
            </>
          ) : category === 'network' ? (
            <form className={styles.settingSection} onSubmit={saveNetworkSettings}>
              <label className={styles.settingRow}>
                <span>{props.t('settings.proxyMode')}</span>
                <select disabled={props.busy} value={proxyMode}
                  onChange={event => setProxyMode(event.target.value as NetworkSettings['proxyMode'])}>
                  <option value="system">{props.t('settings.proxyModeSystem')}</option>
                  <option value="direct">{props.t('settings.proxyModeDirect')}</option>
                  <option value="manual">{props.t('settings.proxyModeManual')}</option>
                </select>
              </label>
              {proxyMode === 'manual' ? (
                <label className={styles.settingRow}>
                  <span>{props.t('settings.proxyUrl')}</span>
                  <input disabled={props.busy} required placeholder="http://127.0.0.1:7890"
                    value={proxyUrl} onChange={event => setProxyUrl(event.target.value)} />
                </label>
              ) : null}
              <p className={styles.networkStatus}>
                {props.networkSettings.systemProxyDetected ? props.t('settings.systemProxyDetected') : props.t('settings.systemProxyNotDetected')}
              </p>
              <Button disabled={props.busy || (proxyMode === 'manual' && !proxyUrl.trim())} type="submit">
                <Save aria-hidden="true" size={16} />{props.t('settings.saveNetwork')}
              </Button>
            </form>
          ) : category === 'appearance' ? (
            <BackgroundMaterialsView
              t={props.t}
              backgrounds={backgrounds}
              followState={previewFollowState}
              material={previewMaterial}
              selectedId={previewBackgroundId}
              general={(
                <div className={styles.generalSettings}>
                  <section className={styles.settingSection}>
                    <label className={styles.scaleRow}>
                      <span>{props.t('settings.uiScale')}</span>
                      <input max="125" min="80" step="5" type="range" value={props.uiScale}
                        onChange={event => props.onChangeUiScale(Number(event.target.value))} />
                      <output>{props.uiScale}%</output>
                    </label>
                  </section>
                  <section className={styles.settingSection}>
                    <label className={styles.scaleRow}>
                      <span>{props.t('settings.canvasWidth')}</span>
                      <input max="1120" min="540" step="20" type="range" value={previewCanvasWidth}
                        onChange={event => setPreviewCanvasWidth(Number(event.target.value))} />
                      <output>{previewCanvasWidth}px</output>
                    </label>
                  </section>
                  <section className={styles.settingSection}>
                    <label className={styles.scaleRow}>
                      <span>{props.t('settings.narrativeOverscan')}</span>
                      <input type="range" min={0} max={50} step={1} value={narrativeOverscan}
                        onChange={event => setNarrativeOverscan(Number(event.target.value))} />
                      <output>{narrativeOverscan}</output>
                    </label>
                  </section>
                  <section className={styles.settingSection}>
                    <label className={styles.settingRow}>
                      <span>{props.t('settings.motion')}</span>
                      <select value={motionPreference} onChange={event => setMotionPreference(event.target.value as MotionPreference)}>
                        <option value="system">{props.t('settings.motionSystem')}</option>
                        <option value="full">{props.t('settings.motionFull')}</option>
                        <option value="reduce">{props.t('settings.motionReduce')}</option>
                      </select>
                    </label>
                  </section>
                  <section className={styles.settingSection}>
                    <label className={styles.settingRow}>
                      <span>{props.t('settings.customCss')}</span>
                      <textarea className={styles.customCssTextarea} placeholder={props.t('settings.customCssPlaceholder')}
                        spellCheck={false} value={props.customCss} onChange={event => props.onChangeCustomCss(event.target.value)} />
                    </label>
                  </section>
                </div>
              )}
              onFollowStateChange={setPreviewFollowState}
              onMaterialChange={setPreviewMaterial}
              onSelect={id => {
                const background = backgrounds.find(item => item.id === id)
                if (background?.scope) {
                  setScopedBackground({ id: background.id, image: background.image, ...background.scope })
                } else {
                  setPreviewBackground(background ?? null)
                }
              }}
            />
          ) : (
            <section className={styles.settingSection}>
              <div className={styles.aboutBrand}>
                <img src="/images/logo.png" alt="" width={64} height={64} />
                <div><h4>Loom Studio</h4><span>v{STUDIO_VERSION}</span></div>
              </div>
              <a className={styles.aboutLink} href="https://github.com/The-LoomStudio/LoomStudio.git" rel="noreferrer" target="_blank">
                <ExternalLink aria-hidden="true" size={15} /><span>GitHub · The-LoomStudio/LoomStudio</span>
              </a>
            </section>
          )}
        </div>
      </MasterDetailWorkbench>
    </section>
  )
}

declare const __LOOM_STUDIO_VERSION__: string

const STUDIO_VERSION = typeof __LOOM_STUDIO_VERSION__ === 'string' ? __LOOM_STUDIO_VERSION__ : '0.0.0-developer-preview'

import { describe, expect, it } from 'vitest'
import { resolveNetworkSettingsPayload } from '../../../apps/studio-client/src/widgets/settings-panel/settings-panel.js'
import { readStudioRoute } from '../../../apps/studio-client/src/shared/studio-shell/studio-route.js'
import { supportedLocales, localeLabels } from '../../../apps/studio-client/src/shared/i18n/index.js'

describe('Settings panel navigation and model rules', () => {
  it('resolves the settings panel from studio route', () => {
    expect(readStudioRoute('/studio/settings')).toEqual({ panel: 'settings' })
  })

  it('resolves network payload accurately based on proxyMode', () => {
    // system mode drops proxyUrl
    expect(resolveNetworkSettingsPayload('system', 'http://127.0.0.1:7890')).toEqual({
      proxyMode: 'system',
    })

    // direct mode drops proxyUrl
    expect(resolveNetworkSettingsPayload('direct', 'http://127.0.0.1:7890')).toEqual({
      proxyMode: 'direct',
    })

    // manual mode includes proxyUrl
    expect(resolveNetworkSettingsPayload('manual', 'http://127.0.0.1:7890')).toEqual({
      proxyMode: 'manual',
      proxyUrl: 'http://127.0.0.1:7890',
    })
  })

  it('guarantees supported locales have valid display labels', () => {
    expect(supportedLocales).toContain('zh-CN')
    expect(supportedLocales).toContain('en-US')
    for (const locale of supportedLocales) {
      expect(localeLabels[locale]).toBeDefined()
      expect(localeLabels[locale].length).toBeGreaterThan(0)
    }
  })
})

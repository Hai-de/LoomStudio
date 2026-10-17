import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { completeOnboarding, readOnboardingComplete, readStudioLocale, saveStudioLocale } from '../../../apps/studio-client/src/features/onboarding/model/onboarding-preferences.js'

describe('browser onboarding preferences', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { languages: ['zh-CN'], language: 'zh-CN' })
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('does not treat choosing a language as finishing onboarding', () => {
    expect(readOnboardingComplete()).toBe(false)
    saveStudioLocale('ja-JP')
    expect(readStudioLocale()).toBe('ja-JP')
    expect(readOnboardingComplete()).toBe(false)
    completeOnboarding()
    expect(readOnboardingComplete()).toBe(true)
    expect(readStudioLocale()).toBe('ja-JP')
  })

  it('rejects unsupported stored locales', () => {
    localStorage.setItem('loom.studio.locale', 'invalid')
    expect(readStudioLocale()).toBe('zh-CN')
  })

  it('uses the first supported browser language, including regional variants', () => {
    vi.stubGlobal('navigator', { languages: ['fr-FR', 'en-GB', 'ja-JP'] })
    expect(readStudioLocale()).toBe('en-US')
    vi.stubGlobal('navigator', { languages: ['zh-TW'] })
    expect(readStudioLocale()).toBe('zh-CN')
    vi.stubGlobal('navigator', { languages: [], language: 'ko-KR' })
    expect(readStudioLocale()).toBe('ko-KR')
  })

  it('keeps an explicit choice over browser preferences and falls back for unsupported languages', () => {
    vi.stubGlobal('navigator', { languages: ['de-DE'] })
    expect(readStudioLocale()).toBe('zh-CN')
    saveStudioLocale('ja-JP')
    vi.stubGlobal('navigator', { languages: ['en-US'] })
    expect(readStudioLocale()).toBe('ja-JP')
  })

  it('surfaces a failed completion write rather than claiming completion', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('Storage unavailable') } })
    expect(() => completeOnboarding()).toThrow('Storage unavailable')
    expect(readOnboardingComplete()).toBe(false)
  })
})

import { supportedLocales, type Locale } from '../../../shared/i18n/index.js'
import { safeLocalStorage } from '../../../shared/browser/safe-local-storage.js'

const completionKey = 'loom.studio.onboarding.completed'
const localeKey = 'loom.studio.locale'
export const assistantPresetId = 'prompt-resource.official.loom-assistant'

export function readOnboardingComplete(): boolean {
  return safeLocalStorage.getItem(completionKey) === '1'
}
export function completeOnboarding(): void {
  // Unlike optional cosmetic preferences, a failed completion write must be visible to the caller.
  localStorage.setItem(completionKey, '1')
}
export function readStudioLocale(): Locale {
  const stored = safeLocalStorage.getItem(localeKey)
  const saved = supportedLocales.find(locale => locale === stored)
  if (saved) return saved
  const browser = globalThis.navigator
  const languages = browser?.languages?.length ? browser.languages : browser?.language ? [browser.language] : []
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0]
    const match = supportedLocales.find(locale => locale.toLowerCase().split('-')[0] === base)
    if (match) return match
  }
  return 'zh-CN'
}
export function saveStudioLocale(locale: Locale): void {
  safeLocalStorage.setItem(localeKey, locale)
}

import { createTranslator } from './index.js'
import { formatDateTime, resolveCurrentLocale } from './format.js'

/** Studio supplies a localized title once, before persisting a new story or session. */
export function createDefaultTitle(kind: 'timeline' | 'session', now = new Date()): string {
  const locale = resolveCurrentLocale()
  const t = createTranslator(locale)
  const date = formatDateTime(now, locale, {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  })
  return `${t(kind === 'timeline' ? 'sessions.defaultTimelineName' : 'sessions.defaultSessionName')} · ${date}`
}

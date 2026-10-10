import type { Locale } from './index.js'

export function resolveCurrentLocale(locale?: string): Locale {
  if (locale === 'zh-CN' || locale === 'en-US') {
    return locale
  }
  if (typeof document !== 'undefined') {
    const lang = document.documentElement.lang
    if (lang === 'zh-CN' || lang === 'en-US') {
      return lang
    }
  }
  return 'zh-CN'
}

function parseDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value)
}

export function formatDateTime(
  value: Date | string | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  const resolvedLocale = resolveCurrentLocale(locale)
  return options
    ? new Intl.DateTimeFormat(resolvedLocale, options).format(date)
    : date.toLocaleString(resolvedLocale)
}

export function formatDate(
  value: Date | string | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }
  const resolvedLocale = resolveCurrentLocale(locale)
  return options
    ? new Intl.DateTimeFormat(resolvedLocale, options).format(date)
    : date.toLocaleDateString(resolvedLocale)
}

export function formatTime(
  value: Date | string | number,
  locale?: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseDate(value)
  if (Number.isNaN(date.getTime())) {
    return '--:--'
  }
  const resolvedLocale = resolveCurrentLocale(locale)
  return date.toLocaleTimeString(resolvedLocale, options ?? { hour: '2-digit', minute: '2-digit' })
}

export function formatNumber(
  value: number,
  locale?: string,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) {
    return String(value)
  }
  return value.toLocaleString(resolveCurrentLocale(locale), options)
}

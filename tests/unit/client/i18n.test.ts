import { readFileSync, readdirSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { enUS } from '../../../apps/studio-client/src/shared/i18n/en-us.js'
import { jaJP } from '../../../apps/studio-client/src/shared/i18n/ja-jp.js'
import { koKR } from '../../../apps/studio-client/src/shared/i18n/ko-kr.js'
import { zhCN } from '../../../apps/studio-client/src/shared/i18n/zh-cn.js'
import {
  createTranslator,
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
  resolveCurrentLocale,
} from '../../../apps/studio-client/src/shared/i18n/index.js'

const root = new URL('../../../apps/studio-client/src/shared/i18n/', import.meta.url)

function readDomains(locale: string) {
  const directory = new URL(`${locale}/`, root)
  return Object.fromEntries(readdirSync(directory).filter(file => file.endsWith('.ts')).map(file => {
    const source = ts.createSourceFile(file, readFileSync(new URL(file, directory), 'utf8'), ts.ScriptTarget.Latest, true)
    const entries: [string, string][] = []
    function visit(node: ts.Node) {
      if (ts.isObjectLiteralExpression(node)) {
        for (const property of node.properties) {
          if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name) || !ts.isStringLiteral(property.initializer)) {
            throw new Error(`${locale}/${file}: dictionaries must contain literal string entries`)
          }
          entries.push([property.name.text, property.initializer.text])
        }
      } else {
        ts.forEachChild(node, visit)
      }
    }
    visit(source)
    expect(entries.length, `${locale}/${file}`).toBeGreaterThan(0)
    return [file, entries]
  }))
}

function placeholders(value: string) {
  return [...new Set([...value.matchAll(/\{\{([^{}]+)\}\}/g)].map(match => match[1]))].sort()
}

describe('i18n dictionaries', () => {
  const chinese = readDomains('zh-cn')
  const english = readDomains('en-us')
  const japanese = readDomains('ja-jp')
  const korean = readDomains('ko-kr')

  it('keeps matching domains, keys and interpolation parameters', () => {
    for (const [localeName, dict] of [['en-us', english], ['ja-jp', japanese], ['ko-kr', korean]] as const) {
      expect(Object.keys(dict).sort(), localeName).toEqual(Object.keys(chinese).sort())
      for (const [domain, entries] of Object.entries(chinese)) {
        const translated = Object.fromEntries(dict[domain]!)
        expect(Object.keys(translated).sort(), `${localeName}/${domain}`).toEqual(entries.map(([key]) => key).sort())
        for (const [key, value] of entries) {
          expect(translated[key]?.trim(), `${localeName}/${key}`).toBeTruthy()
          expect(value.trim(), key).toBeTruthy()
          expect(placeholders(translated[key]!), `${localeName}/${key}`).toEqual(placeholders(value))
        }
      }
    }
  })

  it('has no duplicate keys and exports every domain without losing values', () => {
    for (const [domains, exported] of [[chinese, zhCN], [english, enUS], [japanese, jaJP], [korean, koKR]] as const) {
      const entries = Object.values(domains).flat()
      const keys = entries.map(([key]) => key)
      expect(keys.filter((key, index) => keys.indexOf(key) !== index)).toEqual([])
      expect(exported).toEqual(Object.fromEntries(entries))
    }
  })

  it('uses the selected locale and substitutes string and numeric parameters', () => {
    expect(createTranslator('zh-CN')('sessions.selectTimelineNamed', { name: 'Example' }))
      .toBe(zhCN['sessions.selectTimelineNamed'].replace('{{name}}', 'Example'))
    expect(createTranslator('en-US')('sessions.selectTimelineNamed', { name: 42 }))
      .toBe(enUS['sessions.selectTimelineNamed'].replace('{{name}}', '42'))
    expect(createTranslator('ja-JP')('sessions.selectTimelineNamed', { name: 'サクラ' }))
      .toBe(jaJP['sessions.selectTimelineNamed'].replace('{{name}}', 'サクラ'))
    expect(createTranslator('ko-KR')('sessions.selectTimelineNamed', { name: '테스트' }))
      .toBe(koKR['sessions.selectTimelineNamed'].replace('{{name}}', '테스트'))
    expect(createTranslator('en-US')('sessions.character')).toBe(enUS['sessions.character'])
    expect(createTranslator('ja-JP')('sessions.character')).toBe(jaJP['sessions.character'])
    expect(createTranslator('ko-KR')('sessions.character')).toBe(koKR['sessions.character'])
  })
})

describe('i18n formatting helpers', () => {
  const sampleIso = '2026-10-08T12:30:45Z'
  const sampleDate = new Date(sampleIso)

  it('resolves current locale with fallback to zh-CN', () => {
    expect(resolveCurrentLocale('zh-CN')).toBe('zh-CN')
    expect(resolveCurrentLocale('en-US')).toBe('en-US')
    expect(resolveCurrentLocale('fr-FR')).toBe('zh-CN')
    expect(resolveCurrentLocale()).toBe('zh-CN')
  })

  it('formats date and time respecting explicit locale', () => {
    const zhFormatted = formatDateTime(sampleIso, 'zh-CN')
    const enFormatted = formatDateTime(sampleIso, 'en-US')
    expect(zhFormatted).toBe(sampleDate.toLocaleString('zh-CN'))
    expect(enFormatted).toBe(sampleDate.toLocaleString('en-US'))
    expect(formatDateTime('invalid-date')).toBe('invalid-date')
  })

  it('formats date respecting explicit locale', () => {
    const zhDate = formatDate(sampleIso, 'zh-CN')
    const enDate = formatDate(sampleIso, 'en-US')
    expect(zhDate).toBe(sampleDate.toLocaleDateString('zh-CN'))
    expect(enDate).toBe(sampleDate.toLocaleDateString('en-US'))
    expect(formatDate('invalid-date')).toBe('invalid-date')
  })

  it('formats time with fallback for invalid values', () => {
    const zhTime = formatTime(sampleIso, 'zh-CN', { hour: '2-digit', minute: '2-digit' })
    const enTime = formatTime(sampleIso, 'en-US', { hour: '2-digit', minute: '2-digit' })
    expect(zhTime).toBe(sampleDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
    expect(enTime).toBe(sampleDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    expect(formatTime('invalid-date')).toBe('--:--')
  })

  it('formats numbers and handles non-finite numbers safely', () => {
    expect(formatNumber(1234567.89, 'en-US')).toBe((1234567.89).toLocaleString('en-US'))
    expect(formatNumber(1024, 'zh-CN')).toBe((1024).toLocaleString('zh-CN'))
    expect(formatNumber(NaN)).toBe('NaN')
    expect(formatNumber(Infinity)).toBe('Infinity')
  })
})

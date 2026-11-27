// @vitest-environment happy-dom
import { act, createElement, createRef } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { CodeMirrorEditor, type CodeMirrorEditorHandle } from '../../../apps/studio-client/src/shared/ui/long-text-editor/code-mirror-editor.js'
import { LoomScriptSourceFields } from '../../../apps/studio-client/src/features/loom-scripts/ui/loom-script-source-fields.js'
import { TextRulePreviewDialog } from '../../../apps/studio-client/src/features/loom-scripts/ui/text-rule-preview-dialog.js'
import { createScriptTemplate, createTextRuleScriptTemplate } from '../../../apps/studio-client/src/features/loom-scripts/model/script-template.js'
import { parseLoomScriptSource, serializeLoomScriptMetadata } from '@loom-studio/shared/loom-scripts'
import { defaultScriptPreviewSource } from '../../../apps/studio-client/src/features/loom-scripts/model/script-preview-source.js'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => { if (root) flushSync(() => root!.unmount()); document.body.replaceChildren(); vi.unstubAllGlobals() })

it('uses JavaScript language while keeping multiline metadata readable and navigable without rewriting source', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const ref = createRef<CodeMirrorEditorHandle>()
  const source = '// ==LoomScript==\n// @setting {\n//   "key": "message", "default": "你好"\n// }\n// ==/LoomScript==\nexport function activate(ctx) { return ctx.scriptSettings.message }'
  const onChange = vi.fn()
  flushSync(() => root!.render(createElement(CodeMirrorEditor, { ref, language: 'loom-script', labelledBy: 'source', value: source, onChange, onCommit: vi.fn() })))
  expect(host.querySelector('.cm-loom-metadata-field')?.textContent).toBe('@setting')
  expect([...host.querySelectorAll('.cm-loom-metadata-property')].map(item => item.textContent)).toContain('"key"')
  expect([...host.querySelectorAll('.cm-loom-metadata-string')].map(item => item.textContent)).toContain('"你好"')
  await vi.waitFor(() => expect([...host.querySelectorAll('.cm-line:last-child span')].map(item => item.textContent)).toContain('export'))
  ref.current!.revealLine(3)
  expect(document.activeElement).toBe(host.querySelector('.cm-content'))
  expect(host.querySelector('.cm-content')?.textContent).toBe(source.replaceAll('\n', ''))
  expect(onChange).not.toHaveBeenCalled()
})

it('separates a Markdown rule declaration from its replacement body and bounds both editors', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const source = createTextRuleScriptTemplate()
  await act(async () => root!.render(createElement(LoomScriptSourceFields, {
    source, fileName: 'new-rule.md', onSourceChange: vi.fn(), onFileNameChange: vi.fn(), t: createTranslator('zh-CN'),
  })))
  const summary = host.querySelector('[aria-label="规则摘要"]')!
  expect(summary.textContent).toContain('新文本规则')
  expect(summary.querySelector('[data-loom-component="long-text-editor"]')).not.toBeNull()
  expect(host.querySelectorAll('[data-loom-component="long-text-editor"]')).toHaveLength(2)
  const body = host.querySelector('[aria-label="替换内容"]')!
  const bodyEditor = body.querySelector('[data-loom-component="long-text-editor"]')!
  expect(bodyEditor.getAttribute('data-bounded')).toBe('true')
  expect(body.querySelector('[aria-label="回到替换内容顶部"]')).not.toBeNull()
  expect(body.querySelector('[aria-label="跳到替换内容底部"]')).not.toBeNull()
  expect(body.querySelector('[aria-label="展开源码编辑器"]')).not.toBeNull()
  expect(body.querySelector('button[aria-expanded="true"]')?.textContent).toContain('收起替换正文')
  const before = bodyEditor.getAttribute('style')

  await act(async () => body.querySelector<HTMLButtonElement>('[aria-label="展开源码编辑器"]')!.click())
  expect(body.querySelector('[data-loom-component="long-text-editor"]')!.getAttribute('style')).not.toBe(before)
})

it('uses localized labels for the split Markdown rule editor', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const source = "---\nid: example.rule\nname: Example\nregex: 'x'\nregex_flags: g\nphases: [display]\n---\nbody"
  await act(async () => root!.render(createElement(LoomScriptSourceFields, {
    source, fileName: 'example.md', onSourceChange: vi.fn(), onFileNameChange: vi.fn(), t: createTranslator('en-US'),
  })))
  expect(host.querySelector('[aria-label="Rule summary"]')?.textContent).toContain('Rule declaration')
  expect(host.textContent).toContain('Replacement')
  expect(host.textContent).toContain('Copy full source')
})

it('auto-collapses only a long replacement body and keeps the declaration editor visible', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const source = createTextRuleScriptTemplate().replace('替换后文字', 'x'.repeat(9_000))
  await act(async () => root!.render(createElement(LoomScriptSourceFields, {
    source, fileName: 'long-rule.md', onSourceChange: vi.fn(), onFileNameChange: vi.fn(), t: createTranslator('zh-CN'),
  })))
  const summary = host.querySelector('[aria-label="规则摘要"]')!
  expect(summary.querySelector('[data-loom-component="long-text-editor"]')).not.toBeNull()
  const body = host.querySelector('[aria-label="替换内容"]')!
  expect(body.querySelector('[data-loom-component="long-text-editor"]')).toBeNull()
  expect(body.textContent).toContain('9,000 个字符')
  const expand = [...body.querySelectorAll('button')].find(button => button.textContent === '展开替换正文')!
  await act(async () => expand.click())
  expect(body.querySelector('[data-loom-component="long-text-editor"]')).not.toBeNull()
  expect(host.querySelectorAll('[data-loom-component="long-text-editor"]')).toHaveLength(2)
})

it('previews the complete unsaved rule source and shows the result without saving or changing it', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const source = createTextRuleScriptTemplate()
  const onSourceChange = vi.fn()
  const onPreview = vi.fn(async () => ({ output: '替换后文字', matches: [{ ruleId: 'replace', match: '待替换文字' }], diagnostics: [] }))
  await act(async () => root!.render(createElement(LoomScriptSourceFields, {
    source, fileName: 'new-rule.md', onSourceChange, onFileNameChange: vi.fn(), onPreview, t: createTranslator('zh-CN'),
  })))
  expect(host.querySelector('[aria-label="规则摘要"]')?.textContent).toContain('新文本规则')
  const input = host.querySelector<HTMLTextAreaElement>('[aria-label="规则测试样本文本"]')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, '待替换文字')
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === '测试规则')!.click())
  expect(onPreview).toHaveBeenCalledWith({ source, text: '待替换文字', phase: 'display', streaming: false, previewSource: 'narrative' })
  expect(host.querySelector('pre')?.textContent).toBe('替换后文字')
  expect(onSourceChange).not.toHaveBeenCalled()
})


it('defaults Agent-only rules to Agent and otherwise follows the current context or Narrative', () => {
  expect(parseLoomScriptSource(createScriptTemplate()).metadataId).toMatch(/^script\.[A-Za-z0-9]{11}$/)
  const metadata = parseLoomScriptSource(createTextRuleScriptTemplate())
  expect(metadata.metadataId).toMatch(/^rule\.[A-Za-z0-9]{11}$/)
  const contribution = metadata.contributions[0]!
  if (contribution.kind !== 'text-transform') throw new Error('Expected rule')
  contribution.rule.targets = ['agent-session']
  const agentOnly = serializeLoomScriptMetadata(metadata)
  expect(defaultScriptPreviewSource(agentOnly)).toBe('agent-session')
  expect(defaultScriptPreviewSource(agentOnly, 'narrative')).toBe('agent-session')
  contribution.rule.targets = ['narrative', 'agent-session']
  const both = serializeLoomScriptMetadata(metadata)
  expect(defaultScriptPreviewSource(both)).toBe('narrative')
  expect(defaultScriptPreviewSource(both, 'agent-session')).toBe('agent-session')
  expect(defaultScriptPreviewSource('incomplete source', 'agent-session')).toBe('agent-session')
})

it('switches preview source without publishing a late result from the previous source', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  let resolveOld!: (value: { output: string; matches: []; diagnostics: [] }) => void
  const onPreview = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    .mockResolvedValue({ output: 'Agent result', matches: [], diagnostics: [] })
  await act(async () => root!.render(createElement(LoomScriptSourceFields, {
    source: createTextRuleScriptTemplate(), fileName: 'rule.md', onSourceChange: vi.fn(),
    onFileNameChange: vi.fn(), onPreview, t: createTranslator('zh-CN'),
  })))
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === '测试规则')!.click())
  const selector = host.querySelector<HTMLSelectElement>('[aria-label="样本来源"]')!
  await act(async () => { selector.value = 'agent-session'; selector.dispatchEvent(new Event('change', { bubbles: true })) })
  await act(async () => [...host.querySelectorAll('button')].find(button => button.textContent === '测试规则')!.click())
  expect(onPreview.mock.calls[1]![0].previewSource).toBe('agent-session')
  await act(async () => resolveOld({ output: 'old Narrative result', matches: [], diagnostics: [] }))
  expect(host.querySelector('pre')?.textContent).toBe('Agent result')
})


it('reruns live preview for the selected source and rejects a previous source response', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  let resolveOld!: (value: { output: string; matches: []; diagnostics: [] }) => void
  const onPreview = vi.fn().mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    .mockResolvedValue({ output: 'Narrative current', matches: [], diagnostics: [] })
  await act(async () => root!.render(createElement(TextRulePreviewDialog, {
    source: createTextRuleScriptTemplate(), name: 'Rule', previewContext: 'agent-session',
    onPreview, onClose: vi.fn(), t: createTranslator('zh-CN'),
  })))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 120)) })
  expect(onPreview.mock.calls[0]![0].previewSource).toBe('agent-session')
  const selector = document.querySelector<HTMLSelectElement>('[aria-label="样本来源"]')!
  await act(async () => { selector.value = 'narrative'; selector.dispatchEvent(new Event('change', { bubbles: true })) })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 120)) })
  expect(onPreview.mock.calls[1]![0].previewSource).toBe('narrative')
  await act(async () => resolveOld({ output: 'stale Agent', matches: [], diagnostics: [] }))
  expect(document.body.textContent).toContain('Narrative current')
  expect(document.body.textContent).not.toContain('stale Agent')
})

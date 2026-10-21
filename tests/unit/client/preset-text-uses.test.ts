import { isValidElement, type ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'
import { PresetTextUses } from '../../../apps/studio-client/src/widgets/preset-workbench/preset-workbench.js'
import type { PromptResource } from '../../../apps/studio-client/src/entities/index.js'
import type { StudioApi } from '../../../apps/studio-client/src/shared/api/studio-api.js'
import type { FileTreeNode } from '../../../apps/studio-client/src/shared/ui/file-tree/file-tree.js'

const hooks = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as Array<() => void> }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? initial() : initial
    return [hooks.values[index], (value: unknown) => {
      hooks.values[index] = typeof value === 'function' ? value(hooks.values[index]) : value
    }]
  },
  useEffect: (effect: () => void) => { hooks.cursor++; hooks.effects.push(effect) },
}))

beforeEach(() => { hooks.cursor = 0; hooks.values = []; hooks.effects = [] })

type Element = ReactElement<Record<string, unknown>>
function elements(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(elements)
  if (!isValidElement<Record<string, unknown>>(value)) return []
  const trailing = value.props.renderTrailing as ((node: FileTreeNode) => unknown) | undefined
  const visit = (nodes: FileTreeNode[]): Element[] => nodes.flatMap(node => [
    ...elements(trailing?.(node)), ...visit(node.children ?? []),
  ])
  return [value, ...Object.values(value.props).flatMap(elements),
    ...(trailing ? visit(value.props.nodes as FileTreeNode[]) : [])]
}

describe('Preset text use draft', () => {
  it('keeps rule and role Lore drafts across tabs and a pending CAS failure, then saves both fields', async () => {
    const preset: PromptResource = { id: 'preset', version: 3, resourceKind: 'preset', createdAt: '', updatedAt: '',
      rootNode: { id: 'root', kind: 'module', label: 'Writer' }, textUses: [] }
    const api = {
      listRules: vi.fn(async () => ({ rules: [{ id: 'public-rule', name: 'Public', enabled: true, owner: { kind: 'workspace' } }] })),
      listExtractors: vi.fn(async () => ({ extractors: [{ id: 'extractor', name: 'Extract', enabled: false, owner: { kind: 'extension', packageId: 'example.memory' } }] })),
    } as unknown as StudioApi['textTransforms']
    let rejectSave!: (error: Error) => void
    const onSave = vi.fn()
      .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject }))
      .mockResolvedValueOnce({ ...preset, version: 4, useCardLore: false, useGlobalLore: false,
        textUses: [{ id: 'public-rule', kind: 'rule', enabled: false }] })
    const onOpen = vi.fn()
    const loreContent = vi.fn(() => null)
    const render = () => { hooks.cursor = 0; return elements(PresetTextUses({ preset, api, onSave, onOpen, loreContent, t: createTranslator('zh-CN') })) }
    render()
    for (const effect of hooks.effects.splice(0)) effect()
    const control = (label: string) => render().find(element => element.props['aria-label'] === label)!
    const switchTab = (id: string) => {
      const tabs = render().find(element => element.props.ariaLabel === '预设使用配置')!
      ;(tabs.props.onChange as (id: string) => void)(id)
      expect(render().filter(element => element.props.role === 'tabpanel' && !element.props.hidden)
        .map(element => element.props['aria-label'])).toEqual([
          id === 'lore' ? 'Lore' : id === 'text' ? '正则 / 提取器' : '工具',
        ])
    }
    await vi.waitFor(() => expect(control('启用规则：Public')).toBeDefined())
    const directory = () => render().find(element => element.props.ariaLabel === '正则与提取器来源目录')!
    expect((directory().props.nodes as FileTreeNode[]).map(node => node.label)).toEqual(['我的资源', '扩展 · example.memory'])
    const ruleNode = (directory().props.nodes as FileTreeNode[])[0]!.children![0]!
    ;(directory().props.onSelect as (node: FileTreeNode) => void)(ruleNode)
    expect(onOpen).toHaveBeenCalledWith('rule', 'public-rule')
    expect(render().some(element => element.props['aria-label'] === '编辑规则：Public')).toBe(false)
    const search = render().find(element => element.props['aria-label'] === '搜索正则与提取器')!
    ;(search.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: 'example.memory' } })
    expect((directory().props.nodes as FileTreeNode[]).map(node => node.label)).toEqual(['扩展 · example.memory'])
    ;(search.props.onClear as () => void)()
    const lorePanel = render().find(element => element.props.role === 'tabpanel'
      && element.props['aria-label'] === 'Lore')!
    expect(elements(lorePanel).some(element => element.props['aria-label'] === '使用角色世界书')).toBe(true)
    ;(control('使用角色世界书').props.onClick as () => void)()
    ;(control('使用全局世界书').props.onClick as () => void)()
    switchTab('text')
    ;(control('启用规则：Public').props.onClick as () => void)()
    switchTab('tools')
    switchTab('lore')
    expect(control('使用角色世界书').props['aria-pressed']).toBe(false)
    expect(loreContent).toHaveBeenLastCalledWith(false, false)
    switchTab('text')
    expect(control('启用规则：Public').props['aria-pressed']).toBe(false)
    const save = () => {
      const button = render().find(element => element.props.children === '保存使用配置')!
      ;(button.props.onClick as () => void)()
    }
    save()
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledExactlyOnceWith({
      agentPresetId: 'preset', expectedVersion: 3, useCardLore: false, useGlobalLore: false,
      textUses: [{ id: 'public-rule', kind: 'rule', enabled: false }],
    }))
    switchTab('tools')
    expect(control('使用角色世界书').props.disabled).toBe(true)
    rejectSave(new Error('version conflict'))
    await vi.waitFor(() => expect(render().some(element => element.props.role === 'alert'
      && element.props.children === 'version conflict')).toBe(true))
    switchTab('lore')
    expect(render().some(element => element.props.role === 'alert' && element.props.children === 'version conflict')).toBe(true)
    expect(control('使用角色世界书').props['aria-pressed']).toBe(false)
    switchTab('text')
    expect(control('启用规则：Public').props['aria-pressed']).toBe(false)
    save()
    await vi.waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    expect(onSave.mock.calls[1]).toEqual(onSave.mock.calls[0])
    const all = (directory().props.nodes as FileTreeNode[]).flatMap(folder => folder.children ?? [])
    const actions = (directory().props.getBatchActions as (nodes: FileTreeNode[]) => import('../../../apps/studio-client/src/shared/ui/file-tree/file-tree.js').FileTreeBatchAction[])(all)
    await actions.find(action => action.id === 'enable')!.run(all)
    expect(control('启用规则：Public').props['aria-pressed']).toBe(true)
    expect(control('启用提取器：Extract').props['aria-pressed']).toBe(true)
    await actions.find(action => action.id === 'reset')!.run(all)
    expect(control('启用规则：Public').props['aria-pressed']).toBe(true)
    expect(control('启用提取器：Extract').props['aria-pressed']).toBe(false)
    expect(preset.textUses).toEqual([])

  })
})

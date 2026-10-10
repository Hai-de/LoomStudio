import { isValidElement, type ComponentProps, type ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PresetWorkbench } from '../../../apps/studio-client/src/widgets/preset-workbench/preset-workbench.js'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'
import type { PromptResource } from '../../../apps/studio-client/src/entities/index.js'
import type { ContextAssetNode } from '../../../apps/studio-client/src/entities/index.js'

const hooks = vi.hoisted(() => ({ cursor: 0, values: [] as unknown[], effects: [] as (() => void)[] }))
vi.mock('../../../apps/studio-client/src/features/context-assets/model/use-resource-token-snapshot.js', () => ({
  useResourceTokenSnapshot: () => ({ pending: false, refresh: vi.fn() }),
}))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useId: () => 'test-id',
  useMemo: (fn: () => unknown) => fn(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++
    const values = hooks.values
    if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial
    return [values[index], (value: unknown) => { values[index] = typeof value === 'function' ? value(values[index]) : value }]
  },
  useEffect: (effect: () => void, deps: unknown[]) => {
    const index = hooks.cursor++
    const previous = hooks.values[index] as unknown[] | undefined
    if (previous && deps.every((value, i) => Object.is(value, previous[i]))) return
    hooks.values[index] = deps
    hooks.effects.push(effect)
  },
}))
vi.mock('../../../apps/studio-client/src/shared/studio-shell/studio-layout-store.js', async original => {
  const actual = await original<typeof import('../../../apps/studio-client/src/shared/studio-shell/studio-layout-store.js')>()
  return {
    ...actual,
    useStudioLayoutStore: Object.assign(
      (selector: (state: unknown) => unknown) => selector({
        ...actual.useStudioLayoutStore.getState(),
        presetView: 'assets',
        assetLayouts: {
          preset: { explorerWidth: 260, views: { 'test-ws': { selectedId: 'preset-root-1' } } },
          resources: { explorerWidth: 260, views: {} },
        },
      }),
      { getState: actual.useStudioLayoutStore.getState },
    ),
  }
})
vi.mock('../../../apps/studio-client/src/features/state-variables/ui/macro-authoring-panel.js', () => ({
  useMacroAuthoring: () => ({ selectRow: () => undefined, selectNode: () => undefined }),
  MacroAuthoringDetail: () => null,
  MacroAuthoringExplorer: () => null,
}))
vi.mock('../../../apps/studio-client/src/features/text-transforms/ui/text-transform-panel.js', () => ({
  useTextTransformController: () => ({}),
  TextTransformExplorer: () => null,
  TextTransformDetail: () => null,
}))

type Element = ReactElement<Record<string, unknown>>
function elements(value: unknown): Element[] {
  if (Array.isArray(value)) return value.flatMap(elements)
  if (!isValidElement<Record<string, unknown>>(value)) return []
  return [value, ...Object.values(value.props).flatMap(elements)]
}

function child(tree: unknown, name: string): Element {
  const match = elements(tree).find(item => typeof item.type === 'function' && item.type.name === name)
  expect(match, name).toBeDefined()
  return match!
}

describe('PresetWorkbench tree and rename ID mapping', () => {
  beforeEach(() => {
    hooks.cursor = 0
    hooks.values = []
    hooks.effects = []
  })

  it('assigns preset.rootNode.id to the explorer displayNodes and resolves rootNode.id on rename', async () => {
    const presetResource: PromptResource = {
      id: 'prompt-resource-uuid-1234',
      version: 1,
      resourceKind: 'preset',
      rootNode: {
        id: 'preset-root-node-5678',
        kind: 'module',
        label: 'My Test Preset',
        children: [{ id: 'child-message', kind: 'message', label: 'Message 1' }],
      },
      createdAt: '',
      updatedAt: '',
    }

    const onRenameNode = vi.fn().mockResolvedValue(undefined)
    const props = {
      active: true,
      resources: [presetResource],
      nodes: [],
      settingMounts: [],
      tools: [],
      toolMounts: [],
      draftResourceIds: [],
      workspaceId: 'test-ws',
      searchQuery: '',
      t: createTranslator('zh-CN'),
      onRenameNode,
      onSaveModel: vi.fn(),
      onChangeNode: vi.fn(),
      onCommitNode: vi.fn(),
      onChangeNodes: vi.fn(),
      onMoveNode: vi.fn(),
      onAddNode: vi.fn(),
      onDuplicateNode: vi.fn(),
      onDeleteNode: vi.fn(),
      onCreateResource: vi.fn(),
      onDuplicateResource: vi.fn(),
      onDeleteResource: vi.fn(),
      onImportResource: vi.fn(),
      onExportResource: vi.fn(),
      onReplaceToolMounts: vi.fn(),
      onReplaceSettingMounts: vi.fn(),
      onUpdateTool: vi.fn(),
      onSaveMacros: vi.fn(),
      onDiscardDraft: vi.fn(),
      onRetryDraft: vi.fn(),
      modelProfiles: [],
      providerAccounts: [],
    } as unknown as ComponentProps<typeof PresetWorkbench>

    const tree = PresetWorkbench(props)
    const explorer = child(tree, 'ContextAssetExplorer')
    const displayNodes = explorer.props.displayNodes as ContextAssetNode[]

    // Verify root node uses AST rootNode.id instead of resource.id
    expect(displayNodes[0]?.id).toBe('preset-root-node-5678')
    expect(displayNodes[0]?.label).toBe('My Test Preset')

    // Verify renaming via rootNode.id invokes onRenameNode with rootNode.id
    const renameHandler = explorer.props.onRenameNode as (id: string, label: string) => Promise<void>
    await renameHandler('preset-root-node-5678', 'New Preset Name')
    expect(onRenameNode).toHaveBeenCalledWith('preset-root-node-5678', 'New Preset Name')

    // Verify defensive fallback: if called with resource ID, it resolves to rootNode.id
    await renameHandler('prompt-resource-uuid-1234', 'Another Name')
    expect(onRenameNode).toHaveBeenCalledWith('preset-root-node-5678', 'Another Name')
  })
})

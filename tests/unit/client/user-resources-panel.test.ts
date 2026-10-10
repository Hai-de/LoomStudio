import { describe, expect, it } from 'vitest'
import {
  buildUserResourceTree,
  isUserPromptResource,
} from '../../../apps/studio-client/src/widgets/user-resources-panel/user-resources-panel.js'
import { readStudioRoute } from '../../../apps/studio-client/src/shared/studio-shell/studio-route.js'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'
import type { PromptResource } from '../../../apps/studio-client/src/entities/index.js'

describe('User resources navigation and tree model', () => {
  it('lists manually authored resources without claiming card imports or extension content', () => {
    expect(isUserPromptResource({})).toBe(true)
    expect(isUserPromptResource({ sourceArtifactRef: { artifactId: 'card-bundle' } })).toBe(false)
    expect(isUserPromptResource({ origin: { kind: 'builtin', key: 'starter' } })).toBe(false)
    expect(isUserPromptResource({ origin: {
      kind: 'extension-package', packageId: 'package', packageVersion: '1', contributionId: 'setting',
    } })).toBe(false)
  })

  it('resolves the User entry without changing the narrative target', () => {
    expect(readStudioRoute('/studio/user')).toEqual({ panel: 'user' })
  })

  it('builds tree nodes correctly and indexes resource by node id', () => {
    const presetResource: PromptResource = {
      id: 'res-preset-1',
      version: 1,
      resourceKind: 'preset',
      rootNode: {
        id: 'node-preset-root',
        kind: 'module',
        label: 'Custom Preset',
        children: [{ id: 'child-1', kind: 'message', label: 'Child Message' }],
      },
      createdAt: '',
      updatedAt: '',
    }

    const settingResource: PromptResource = {
      id: 'res-setting-1',
      version: 1,
      resourceKind: 'setting',
      rootNode: { id: 'node-setting-root', kind: 'module', label: 'Custom Setting' },
      createdAt: '',
      updatedAt: '',
    }

    const foreignResource: PromptResource = {
      id: 'res-builtin-1',
      version: 1,
      resourceKind: 'setting',
      origin: { kind: 'builtin', key: 'sys' },
      rootNode: { id: 'node-ext-root', kind: 'module', label: 'System Setting' },
      createdAt: '',
      updatedAt: '',
    }

    const rules = [
      { id: 'rule-workspace-1', name: 'Workspace Rule', owner: { kind: 'workspace' } },
      { id: 'rule-card-1', name: 'Card Rule', owner: { kind: 'card' } },
    ]

    const t = createTranslator('zh-CN')
    const { nodes, resourcesByNode } = buildUserResourceTree(
      [presetResource, settingResource, foreignResource],
      rules,
      t,
    )

    // Presets group
    const presetGroup = nodes.find(n => n.id === 'user:presets')
    expect(presetGroup).toBeDefined()
    expect(presetGroup?.children).toHaveLength(1)
    expect(presetGroup?.children?.[0].id).toBe('node-preset-root')
    expect(presetGroup?.children?.[0].label).toBe('Custom Preset')
    expect(presetGroup?.children?.[0].children?.[0].id).toBe('child-1')

    // Settings group
    const settingGroup = nodes.find(n => n.id === 'user:settings')
    expect(settingGroup).toBeDefined()
    expect(settingGroup?.children).toHaveLength(1)
    expect(settingGroup?.children?.[0].id).toBe('node-setting-root')

    // Rules group (filters to workspace-only rules)
    const ruleGroup = nodes.find(n => n.id === 'user:rules')
    expect(ruleGroup).toBeDefined()
    expect(ruleGroup?.children).toHaveLength(1)
    expect(ruleGroup?.children?.[0].id).toBe('user:rule:rule-workspace-1')

    // Verify lookup index by node id
    expect(resourcesByNode.get('node-preset-root')).toBe(presetResource)
    expect(resourcesByNode.get('child-1')).toBe(presetResource)
    expect(resourcesByNode.get('node-setting-root')).toBe(settingResource)
    expect(resourcesByNode.get('node-ext-root')).toBeUndefined()
  })
})

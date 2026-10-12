import { describe, expect, it } from 'vitest'
import type { PromptResource } from '../../../apps/studio-client/src/entities/index.js'
import { readLoreTreeMeta, resolveLoreScope } from '../../../apps/studio-client/src/widgets/context-workbench/lore-target.js'

const setting = (id: string, installationId?: string) => ({
  id,
  resourceKind: 'lore',
  ...(installationId ? { origin: { kind: 'extension-package', installationId } } : {}),
}) as PromptResource

describe('Lore scope', () => {
  it('shows placement anchors instead of editorial metadata for Lore entries', () => {
    expect(readLoreTreeMeta({
      id: 'entry', label: '世界观', kind: 'entry', meta: '基础 · System',
      capabilities: { targetAnchorId: '@lore.stable' },
    })).toBe('@lore.stable')
    expect(readLoreTreeMeta({ id: 'folder', label: '创作工作流', kind: 'folder', meta: '按需加载' })).toBeUndefined()
    expect(readLoreTreeMeta({ id: 'root', label: '资源', kind: 'folder', category: 'lore-root', meta: '当前卡片 · 工作区自有' })).toBe('当前卡片 · 工作区自有')
    expect(readLoreTreeMeta({ id: 'legacy', label: '旧条目', kind: 'entry', meta: '旧描述' })).toBeUndefined()
  })

  it('separates current Card references from global mounts and global extension installations', () => {
    const lore = [
      setting('card'), setting('manual-global'), setting('user-only'),
      setting('global-extension', 'global-install'), setting('card-extension', 'card-install'),
      { id: 'builtin-setting', resourceKind: 'lore', origin: { kind: 'builtin' } } as PromptResource,
    ]
    const installations = [
      { id: 'global-install', target: { kind: 'global' } },
      { id: 'card-install', target: { kind: 'card' } },
    ]
    expect(resolveLoreScope(lore, new Set(['manual-global']), new Set(['card', 'card-extension']), installations, 'current')
      .map(item => item.id)).toEqual(['card', 'card-extension'])
    expect(resolveLoreScope(lore, new Set(['manual-global']), new Set(['card', 'card-extension']), installations, 'global')
      .map(item => item.id)).toEqual(['manual-global', 'global-extension', 'builtin-setting'])
    expect(resolveLoreScope(lore, new Set(), new Set(), installations, 'current')).toEqual([])
  })
})

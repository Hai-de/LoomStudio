import { describe, expect, it, vi } from 'vitest'
import { buildContextPathSegments } from '../../../apps/studio-client/src/features/context-assets/ui/context-asset-header/build-context-path-segments.js'
import type { ContextAssetNode } from '../../../apps/studio-client/src/entities/index.js'

describe('workbench header path', () => {
  it('omits the root and keeps each level bound to its own siblings and selection callback', () => {
    const leaf: ContextAssetNode = { id: 'leaf', label: 'Leaf', kind: 'entry' }
    const sibling: ContextAssetNode = { id: 'sibling', label: 'Sibling', kind: 'entry' }
    const folder: ContextAssetNode = { id: 'folder', label: 'Folder', kind: 'folder', children: [leaf, sibling] }
    const root: ContextAssetNode = { id: 'root', label: 'Root', kind: 'folder', children: [folder] }
    const select = vi.fn()
    const segments = buildContextPathSegments([root, folder, leaf], select)
    expect(segments.map(segment => segment.id)).toEqual(['folder', 'leaf'])
    expect(segments[0].options?.map(option => option.id)).toEqual(['folder'])
    expect(segments[1].options?.map(option => option.id)).toEqual(['leaf', 'sibling'])
    segments[1].onSelect?.('sibling')
    expect(select).toHaveBeenCalledWith('sibling')
    expect(buildContextPathSegments([root], select)).toEqual([])
  })
})

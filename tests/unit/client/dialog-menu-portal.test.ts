// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, Dialog } from '@loom-studio/ui'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
afterEach(() => vi.unstubAllGlobals())

describe('Menus inside native dialogs', () => {
  it('portals a context menu into its nearest dialog', async () => {
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const close = vi.fn()
    function render(childOpen: boolean) {
      act(() => root.render(createElement(Dialog, { id: 'parent', open: true, title: 'History', onClose: close },
        createElement(Dialog, { id: 'child', open: childOpen, title: 'Details', onClose: close },
          createElement(ContextMenu, null,
            createElement(ContextMenuTrigger, { asChild: true }, createElement('button', { id: 'menu-trigger' }, 'Actions')),
            createElement(ContextMenuContent, null, createElement(ContextMenuItem, null, 'Rename')))))))
    }
    try {
      render(false)
      render(true)
      await act(async () => {
        container.querySelector('#menu-trigger')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 80, clientY: 80 }))
      })
      expect(container.querySelector('[data-menu-kind="context"]')?.closest('dialog')?.id).toBe('child')
      expect(close).not.toHaveBeenCalled()
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})

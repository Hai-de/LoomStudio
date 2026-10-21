// @vitest-environment happy-dom
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from '@loom-studio/ui'
import { ProviderAccountList } from '../../../apps/studio-client/src/widgets/model-panel/provider-account-list.js'
import { createTranslator } from '../../../apps/studio-client/src/shared/i18n/index.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

describe('Model tool account confirmation', () => {
  it('waits for confirmation and keeps failed deletion visible inside the parent workbench', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('Account is in use'))
    const closeParent = vi.fn()
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    act(() => root.render(createElement(Dialog, { open: true, title: 'Models', layout: 'workbench', onClose: closeParent },
      createElement(ProviderAccountList, {
        accounts: [{ id: 'account', version: 1, displayName: 'Example', providerExtensionId: 'official.openai-compatible',
          config: { baseUrl: 'https://example.com/v1' }, enabledModelIds: [], credential: { configured: true },
          createdAt: '', updatedAt: '' }],
        busy: false, modelProfiles: [], onDelete,
        onCreateModel: vi.fn(), onDeleteModel: vi.fn(), onListModels: vi.fn(), onUpdateConnection: vi.fn(),
        t: createTranslator('zh-CN'),
      }))))
    try {
      const parent = container.querySelector('dialog')!
      act(() => container.querySelector<HTMLButtonElement>('button[aria-label="删除提供商账户"]')!.click())
      const child = parent.querySelector('dialog')!
      expect(child.open).toBe(true)
      expect(onDelete).not.toHaveBeenCalled()
      const confirm = [...child.querySelectorAll('button')].find(button => button.textContent === '删除提供商账户')!
      await act(async () => { confirm.click() })
      expect(onDelete).toHaveBeenCalledExactlyOnceWith('account')
      expect(child.open).toBe(true)
      expect(child.querySelector('[role="alert"]')?.textContent).toContain('Account is in use')
      act(() => { child.dispatchEvent(new Event('cancel', { bubbles: true, cancelable: true })) })
      expect(child.open).toBe(false)
      expect(parent.open).toBe(true)
      expect(closeParent).not.toHaveBeenCalled()
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})

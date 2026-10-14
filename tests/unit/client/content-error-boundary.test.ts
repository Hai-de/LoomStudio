// @vitest-environment happy-dom
import { act, createElement as h, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { ContentErrorBoundary } from '../../../apps/studio-client/src/shared/ui/content-error-boundary.js'

it('contains a rejected lazy module, keeps sibling controls, and resets for a new surface', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  const container = document.createElement('div')
  const root = createRoot(container)
  const log = vi.spyOn(console, 'error').mockImplementation(() => {})
  const failed = lazy(async () => { throw new Error('chunk unavailable') })
  const clicked = vi.fn()
  const render = (resetKey: string, broken: boolean) => root.render(h('div', null,
    h('button', { onClick: clicked }, 'navigation'),
    h(ContentErrorBoundary, { resetKey, fallback: h('pre', null, 'original code'), children:
      h(Suspense, { fallback: 'loading' }, broken ? h(failed) : h('p', null, 'recovered')) }),
  ))
  try {
    await act(async () => { render('first', true) })
    expect(container.textContent).toBe('navigationoriginal code')
    act(() => container.querySelector('button')!.click())
    expect(clicked).toHaveBeenCalledOnce()
    await act(async () => { render('second', false) })
    expect(container.textContent).toBe('navigationrecovered')
  } finally { act(() => root.unmount()); log.mockRestore() }
})

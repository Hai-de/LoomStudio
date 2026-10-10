import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true

export function renderHook<T>(hook: () => T) {
  let result!: T
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  function TestComponent() {
    result = hook()
    return null
  }

  act(() => {
    root.render(createElement(TestComponent))
  })

  return {
    get current() {
      return result
    },
    unmount() {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

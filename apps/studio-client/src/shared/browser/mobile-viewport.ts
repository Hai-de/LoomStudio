export function syncMobileViewport(targetRoot: HTMLElement = document.documentElement): () => void {
  if (typeof window === 'undefined') return () => {}

  const root = targetRoot
  const update = () => {
    const vv = window.visualViewport
    const currentHeight = Math.round(vv ? vv.height : window.innerHeight)
    const inset = Math.max(0, Math.round(window.innerHeight - currentHeight))
    const isKeyboardOpen = inset > 60

    root.style.setProperty('--loom-viewport-height', `${currentHeight}px`)
    root.style.setProperty('--loom-keyboard-inset', `${inset}px`)
    if (isKeyboardOpen) {
      root.dataset.keyboardOpen = 'true'
    } else {
      delete root.dataset.keyboardOpen
    }
  }

  const handleScroll = () => {
    // Prevent iOS Safari elastic bounce dislocation when virtual keyboard appears
    if (window.scrollY !== 0) {
      window.scrollTo(0, 0)
    }
  }

  update()

  const vv = window.visualViewport
  if (vv) {
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', handleScroll)
  }
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)

  return () => {
    if (vv) {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', handleScroll)
    }
    window.removeEventListener('resize', update)
    window.removeEventListener('orientationchange', update)
    root.style.removeProperty('--loom-viewport-height')
    root.style.removeProperty('--loom-keyboard-inset')
    delete root.dataset.keyboardOpen
  }
}

import { useEffect } from 'react'

async function waitForStartupEffects(curtain: HTMLElement): Promise<void> {
  const animations = curtain.getAnimations({ subtree: true })
    .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
  if (!animations.length) return
  let timer: ReturnType<typeof setTimeout> | undefined
  // Theme effects must never hold the application behind the curtain indefinitely.
  await Promise.race([
    Promise.allSettled(animations.map(animation => animation.finished)),
    new Promise<void>(resolve => { timer = setTimeout(resolve, 1200) }),
  ])
  clearTimeout(timer)
}

export function dismissStartupCurtain(): void {
  const curtain = document.getElementById('loom-startup')
  if (!curtain || curtain.hasAttribute('data-dismissing')) return
  curtain.setAttribute('data-dismissing', '')
  void (async () => {
    // Flush freshly adopted theme styles before collecting their crossfade effects.
    getComputedStyle(curtain).backgroundColor
    await waitForStartupEffects(curtain)
    curtain.setAttribute('data-leaving', '')
    getComputedStyle(curtain).opacity
    await waitForStartupEffects(curtain)
    curtain.remove()
  })()
}

/** Dismiss only after React has committed the usable page underneath. */
export function StartupReady() {
  useEffect(dismissStartupCurtain, [])
  return null
}

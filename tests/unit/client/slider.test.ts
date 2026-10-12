// @vitest-environment happy-dom
import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ElasticSlider, Slider } from '@loom-studio/ui'

describe('Slider / ElasticSlider component', () => {
  let container: HTMLDivElement | null = null

  afterEach(() => {
    if (container) {
      container.remove()
      container = null
    }
  })

  it('renders static markup with proper accessibility attributes', () => {
    const html = renderToStaticMarkup(
      React.createElement(Slider, { label: '音量', min: 0, max: 100, defaultValue: 50 })
    )

    expect(html).toContain('role="slider"')
    expect(html).toContain('aria-label="音量"')
    expect(html).toContain('aria-valuenow="50"')
    expect(html).toContain('aria-valuemin="0"')
    expect(html).toContain('aria-valuemax="100"')
    expect(html).toContain('音量')
    expect(html).toContain('50.00')
  })

  it('supports custom icon extension and formatValue', () => {
    const html = renderToStaticMarkup(
      React.createElement(Slider, {
        label: '透明度',
        icon: React.createElement('span', { className: 'custom-icon' }, '🎨'),
        min: 0,
        max: 1,
        step: 0.1,
        defaultValue: 0.8,
        formatValue: (v: number) => `${Math.round(v * 100)}%`,
      })
    )

    expect(html).toContain('custom-icon')
    expect(html).toContain('🎨')
    expect(html).toContain('透明度')
    expect(html).toContain('80%')
  })

  it('handles keyboard navigation and triggers onValueChange in DOM', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const handleChange = vi.fn()
    flushSync(() => {
      root.render(
        React.createElement(ElasticSlider, {
          label: '缩放',
          min: 0,
          max: 10,
          step: 1,
          defaultValue: 5,
          onValueChange: handleChange,
        })
      )
    })

    const slider = container.querySelector('[role="slider"]') as HTMLDivElement
    expect(slider).toBeDefined()

    // ArrowRight: 5 -> 6
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(handleChange).toHaveBeenCalledWith(6)

    // ArrowLeft: 5 -> 4
    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(handleChange).toHaveBeenCalledWith(4)

    root.unmount()
  })

  it('respects disabled state', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const handleChange = vi.fn()
    flushSync(() => {
      root.render(
        React.createElement(Slider, {
          label: '只读项',
          disabled: true,
          min: 0,
          max: 10,
          defaultValue: 5,
          onValueChange: handleChange,
        })
      )
    })

    const slider = container.querySelector('[role="slider"]') as HTMLDivElement
    expect(slider.getAttribute('aria-disabled')).toBe('true')

    slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(handleChange).not.toHaveBeenCalled()

    root.unmount()
  })

  it('separates click and drag: pointerdown does not jump value, pointerup performs smooth click snap', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const handleChange = vi.fn()
    flushSync(() => {
      root.render(
        React.createElement(Slider, {
          label: '透明度',
          min: 0,
          max: 100,
          step: 1,
          defaultValue: 20,
          onValueChange: handleChange,
        })
      )
    })

    const slider = container.querySelector('[role="slider"]') as HTMLDivElement
    const wrapper = container.querySelector('.loom-ui-slider-inner-wrapper') as HTMLDivElement

    // Mock bounding client rect for wrapper
    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 300,
      top: 50,
      bottom: 88,
      width: 200,
      height: 38,
      x: 100,
      y: 50,
      toJSON: () => {},
    })
    Object.defineProperty(wrapper, 'offsetWidth', { value: 200, configurable: true })

    // 1. PointerDown at 60% position (clientX = 220, offset 120 / 200 = 60%)
    // Should NOT immediately trigger handleChange
    const downEvent = new PointerEvent('pointerdown', {
      clientX: 220,
      clientY: 60,
      button: 0,
      bubbles: true,
    })
    slider.dispatchEvent(downEvent)
    expect(handleChange).not.toHaveBeenCalled()

    // 2. PointerUp without movement (< 3px) -> Click recognized, snaps to 60
    const upEvent = new PointerEvent('pointerup', {
      clientX: 220,
      clientY: 60,
      button: 0,
      bubbles: true,
    })
    slider.dispatchEvent(upEvent)
    expect(handleChange).toHaveBeenCalledWith(60)

    root.unmount()
  })

  it('triggers drag and continuous updates when movement exceeds 3px threshold', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const handleChange = vi.fn()
    flushSync(() => {
      root.render(
        React.createElement(Slider, {
          label: '缩放',
          min: 0,
          max: 100,
          step: 1,
          defaultValue: 20,
          onValueChange: handleChange,
        })
      )
    })

    const slider = container.querySelector('[role="slider"]') as HTMLDivElement
    const wrapper = container.querySelector('.loom-ui-slider-inner-wrapper') as HTMLDivElement

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      left: 100,
      right: 300,
      top: 50,
      bottom: 88,
      width: 200,
      height: 38,
      x: 100,
      y: 50,
      toJSON: () => {},
    })
    Object.defineProperty(wrapper, 'offsetWidth', { value: 200, configurable: true })

    // 1. PointerDown at start (clientX = 140, 20%)
    slider.dispatchEvent(new PointerEvent('pointerdown', { clientX: 140, clientY: 60, button: 0, bubbles: true }))
    expect(handleChange).not.toHaveBeenCalled()

    // 2. Micro movement of 2px (within threshold) -> does NOT start drag
    slider.dispatchEvent(new PointerEvent('pointermove', { clientX: 142, clientY: 60, bubbles: true }))
    expect(handleChange).not.toHaveBeenCalled()

    // 3. Movement exceeds threshold (> 3px, e.g. clientX = 180 -> 40%) -> drag active!
    slider.dispatchEvent(new PointerEvent('pointermove', { clientX: 180, clientY: 60, bubbles: true }))
    expect(handleChange).toHaveBeenCalledWith(40)

    // 4. Further drag to clientX = 260 -> 80%
    slider.dispatchEvent(new PointerEvent('pointermove', { clientX: 260, clientY: 60, bubbles: true }))
    expect(handleChange).toHaveBeenCalledWith(80)

    root.unmount()
  })

  it('snaps magnetically to deciles within 3.125% range on click', () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const handleChange = vi.fn()
    flushSync(() => {
      root.render(
        React.createElement(Slider, {
          label: '连续滑块',
          min: 0,
          max: 100,
          step: 0.1,
          defaultValue: 0,
          onValueChange: handleChange,
        })
      )
    })

    const slider = container.querySelector('[role="slider"]') as HTMLDivElement
    const wrapper = container.querySelector('.loom-ui-slider-inner-wrapper') as HTMLDivElement

    vi.spyOn(wrapper, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      right: 1000,
      top: 0,
      bottom: 38,
      width: 1000,
      height: 38,
      x: 0,
      y: 0,
      toJSON: () => {},
    })
    Object.defineProperty(wrapper, 'offsetWidth', { value: 1000, configurable: true })

    // 1. Click at clientX = 515 (51.5%, which is within 3.125% of 50%) -> snaps to 50!
    slider.dispatchEvent(new PointerEvent('pointerdown', { clientX: 515, clientY: 19, button: 0, bubbles: true }))
    slider.dispatchEvent(new PointerEvent('pointerup', { clientX: 515, clientY: 19, button: 0, bubbles: true }))
    expect(handleChange).toHaveBeenCalledWith(50)

    // 2. Click at clientX = 550 (55%, outside 3.125% magnetic range of 50% or 60%) -> keeps 55
    slider.dispatchEvent(new PointerEvent('pointerdown', { clientX: 550, clientY: 19, button: 0, bubbles: true }))
    slider.dispatchEvent(new PointerEvent('pointerup', { clientX: 550, clientY: 19, button: 0, bubbles: true }))
    expect(handleChange).toHaveBeenCalledWith(55)

    root.unmount()
  })
})

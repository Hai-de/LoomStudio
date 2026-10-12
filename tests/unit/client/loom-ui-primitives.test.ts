import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Button, Checkbox, Field, IconButton, Radio, RadioGroup, SearchField, TextInput } from '@loom-studio/ui'

describe('@loom-studio/ui primitives', () => {
  it('keeps native button semantics and accessible icon labels', () => {
    const html = renderToStaticMarkup(createElement('div', null,
      createElement(Button, null, 'Default'),
      createElement(Button, { disabled: true, type: 'submit' }, 'Submit'),
      createElement(IconButton, { 'aria-label': 'Refresh', children: 'R' }),
    ))

    expect(html).toContain('data-loom-ui-button=""')
    expect(html).toContain('type="button"')
    expect(html).toContain('disabled="" type="submit"')
    expect(html).toContain('aria-label="Refresh"')
  })

  it('associates field help and errors with its control', () => {
    const html = renderToStaticMarkup(createElement(Field, {
      id: 'display-name',
      label: 'Display name',
      description: 'Shown to readers',
      error: 'Required',
      children: controlProps => createElement(TextInput, { ...controlProps, readOnly: true, value: '' }),
    }))

    expect(html).toContain('for="display-name"')
    expect(html).toContain('id="display-name"')
    expect(html).toContain('aria-describedby="display-name-description"')
    expect(html).toContain('aria-errormessage="display-name-error"')
    expect(html).toContain('aria-invalid="true"')
  })

  it('renders the shared search contract', () => {
    const html = renderToStaticMarkup(createElement(SearchField, {
      'aria-label': 'Search',
      clearLabel: 'Clear search',
      value: 'loom',
      onChange: vi.fn(),
      onClear: vi.fn(),
    }))

    expect(html).toContain('type="search"')
    expect(html).toContain('aria-label="Clear search"')
  })

  it('renders radio and radio group with accessible choices and label wrappers', () => {
    const standalone = renderToStaticMarkup(createElement(Radio, {
      name: 'mode',
      value: 'glass',
      label: '毛玻璃',
      checked: true,
      onChange: vi.fn(),
    }))
    expect(standalone).toContain('data-loom-ui-choice-label=""')
    expect(standalone).toContain('data-loom-ui-radio=""')
    expect(standalone).toContain('type="radio"')
    expect(standalone).toContain('checked=""')
    expect(standalone).toContain('data-loom-ui-choice-text=""')
    expect(standalone).toContain('毛玻璃')

    const group = renderToStaticMarkup(createElement(RadioGroup, {
      name: 'surface-mode',
      value: 'translucent',
      options: [
        { value: 'solid', label: '实色' },
        { value: 'translucent', label: '半透明' },
      ],
      onChange: vi.fn(),
    }))
    expect(group).toContain('data-loom-ui-radio-group=""')
    expect(group).toContain('role="radiogroup"')
    expect(group).toContain('实色')
    expect(group).toContain('半透明')
  })

  it('renders checkbox with optional label wrapper', () => {
    const withLabel = renderToStaticMarkup(createElement(Checkbox, {
      label: '启用毛玻璃',
      checked: true,
      onChange: vi.fn(),
    }))
    expect(withLabel).toContain('data-loom-ui-choice-label=""')
    expect(withLabel).toContain('data-loom-ui-checkbox=""')
    expect(withLabel).toContain('启用毛玻璃')

    const bare = renderToStaticMarkup(createElement(Checkbox, { checked: false, onChange: vi.fn() }))
    expect(bare).not.toContain('data-loom-ui-choice-label=""')
    expect(bare).toContain('data-loom-ui-checkbox=""')
  })
})

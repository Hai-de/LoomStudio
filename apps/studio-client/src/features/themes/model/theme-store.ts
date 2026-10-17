import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { StyleParameterValue } from '@loom-studio/extension-sdk'
import { safeLocalStorage } from '../../../shared/browser/safe-local-storage.js'

export type ThemeSelection = { theme: string | null; enhancements: string[]; cssOnly: string[] }
export type ThemeOverrides = Record<string, Record<string, StyleParameterValue>>
export const defaultThemeSelection: ThemeSelection = { theme: null, enhancements: [], cssOnly: [] }

type ThemePreferences = {
  selection: ThemeSelection
  overrides: ThemeOverrides
  customCss: string
  commit(selection: ThemeSelection, overrides: ThemeOverrides): void
  setCustomCss(css: string): void
}

export const useThemeStore = create<ThemePreferences>()(persist(set => ({
  selection: defaultThemeSelection,
  overrides: {},
  customCss: '',
  commit: (selection, overrides) => set({ selection, overrides }),
  setCustomCss: customCss => set({ customCss }),
}), {
  name: 'loom-studio-themes',
  storage: createJSONStorage(() => safeLocalStorage),
  partialize: ({ selection, overrides, customCss }) => ({ selection, overrides, customCss }),
  merge: (saved, current) => {
    if (!saved || typeof saved !== 'object') return current
    const data = saved as Partial<ThemePreferences>
    const selection = data.selection
    const strings = (values: unknown): values is string[] => Array.isArray(values) && values.every(value => typeof value === 'string')
    const overrides: ThemeOverrides = {}
    if (data.overrides && typeof data.overrides === 'object') {
      for (const [owner, values] of Object.entries(data.overrides)) {
        if (!values || typeof values !== 'object' || Array.isArray(values)) continue
        overrides[owner] = Object.fromEntries(Object.entries(values).filter(([, value]) =>
          typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))))
      }
    }
    return {
      ...current, overrides,
      customCss: typeof data.customCss === 'string' ? data.customCss : '',
      selection: selection && (selection.theme === null || typeof selection.theme === 'string')
        && strings(selection.enhancements) && strings(selection.cssOnly)
        ? { theme: selection.theme, enhancements: [...new Set(selection.enhancements)], cssOnly: [...new Set(selection.cssOnly)] }
        : defaultThemeSelection,
    }
  },
}))

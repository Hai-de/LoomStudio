import { toast } from 'sonner'
import type { Translator } from '../i18n/index.js'
import { formatProviderErrorMessage } from './provider-error.js'

export type NotifyOptions = {
  id?: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export const notify = {
  success(message: string, options?: NotifyOptions): string | number {
    return toast.success(message, {
      id: options?.id,
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    })
  },

  error(message: string, options?: NotifyOptions): string | number {
    return toast.error(message, {
      id: options?.id,
      description: options?.description,
      duration: options?.duration ?? 6000,
      action: options?.action,
    })
  },

  warning(message: string, options?: NotifyOptions): string | number {
    return toast.warning(message, {
      id: options?.id,
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    })
  },

  info(message: string, options?: NotifyOptions): string | number {
    return toast.info(message, {
      id: options?.id,
      description: options?.description,
      duration: options?.duration,
      action: options?.action,
    })
  },

  providerError(error: unknown, t?: Translator, options?: NotifyOptions): string | number {
    const formatted = formatProviderErrorMessage(error, t)
    return toast.error(formatted.title, {
      id: options?.id ?? 'provider-error-active',
      description: options?.description ?? formatted.description,
      duration: options?.duration ?? 8000,
      action: options?.action,
    })
  },

  dismiss(id?: string | number): void {
    toast.dismiss(id)
  },
}

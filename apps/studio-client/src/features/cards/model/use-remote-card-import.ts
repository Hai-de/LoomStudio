import { useEffect, useRef, useState } from 'react'
import type { Translator } from '../../../shared/i18n/index.js'
import { readBoundedResponseBlob } from '../../../shared/browser/download.js'

const MAX_REMOTE_CARD_BYTES = 128 * 1024 * 1024

export function useRemoteCardImport(onImportCards: (files: File[]) => Promise<void>, t: Translator) {
  const [remoteImportOpen, setRemoteImportOpen] = useState(false)
  const [remoteImportUrl, setRemoteImportUrl] = useState('')
  const [remoteImportError, setRemoteImportError] = useState('')
  const [remoteImportBusy, setRemoteImportBusy] = useState(false)
  const remoteImportAbortRef = useRef<AbortController | null>(null)
  useEffect(() => () => {
    remoteImportAbortRef.current?.abort()
    remoteImportAbortRef.current = null
  }, [])
  function closeRemoteImport() {
    if (remoteImportBusy) return
    setRemoteImportOpen(false)
    setRemoteImportUrl('')
    setRemoteImportError('')
  }

  async function importRemoteCard() {
    if (remoteImportAbortRef.current) return
    const controller = new AbortController()
    remoteImportAbortRef.current = controller
    setRemoteImportError('')
    setRemoteImportBusy(true)
    try {
      const url = new URL(remoteImportUrl.trim())
      if (url.protocol !== 'https:') throw new Error(t('character.importRemoteHttpsOnly'))
      const response = await fetch(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal })
      if (!response.ok) throw new Error(t('character.importRemoteDownloadFailed', { status: response.status }))
      const blob = await readBoundedResponseBlob(response, MAX_REMOTE_CARD_BYTES, t('character.importRemoteTooLarge'))
      controller.signal.throwIfAborted()
      const fileName = remoteCardFileName(url, blob.type)
      await onImportCards([new File([blob], fileName, { type: blob.type })])
      if (controller.signal.aborted) return
      setRemoteImportOpen(false)
      setRemoteImportUrl('')
    } catch (error) {
      if (!controller.signal.aborted) setRemoteImportError(error instanceof Error ? error.message : String(error))
    } finally {
      controller.abort()
      if (remoteImportAbortRef.current === controller) {
        remoteImportAbortRef.current = null
        setRemoteImportBusy(false)
      }
    }
  }
  function changeRemoteImportUrl(value: string) {
    setRemoteImportUrl(value)
    setRemoteImportError('')
  }

  return { remoteImportOpen, setRemoteImportOpen, remoteImportUrl, changeRemoteImportUrl, remoteImportError, remoteImportBusy, closeRemoteImport, importRemoteCard }
}

function remoteCardFileName(url: URL, contentType: string): string {
  const candidate = url.pathname.split('/').pop() || ''
  if (/\.(?:loomcard|zip|png)$/i.test(candidate)) return candidate
  return contentType === 'application/vnd.loom.card+zip' || contentType === 'application/zip' ? 'remote-card.loomcard.zip' : 'remote-card.png'
}

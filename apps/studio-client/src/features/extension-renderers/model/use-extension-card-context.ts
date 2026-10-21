import { useEffect, useState } from 'react'
import type { Card } from '../../../entities/index.js'
import type { StudioApi } from '../../../shared/api/studio-api.js'

export function useExtensionCardContext(api: StudioApi, cardId?: string, editorCard?: Card, revision?: number | string) {
  const [loaded, setLoaded] = useState<{ api: StudioApi; card: Card }>()
  const [error, setError] = useState<{ api: StudioApi; cardId: string; message: string }>()
  useEffect(() => {
    if (!cardId) return
    let current = true
    void api.cards.get(cardId).then(({ card }) => {
      if (current) { setLoaded({ api, card }); setError(undefined) }
    }, cause => {
      if (current) setError({ api, cardId, message: cause instanceof Error ? cause.message : String(cause) })
    })
    return () => { current = false }
  }, [api, cardId, editorCard?.id === cardId ? editorCard?.version : undefined, revision])
  return {
    card: loaded?.api === api && loaded.card.id === cardId ? loaded.card
      : editorCard?.id === cardId ? editorCard : undefined,
    error: error?.api === api && error.cardId === cardId ? error.message : undefined,
  }
}

import { useEffect, useState } from 'react'
import { countTexts } from './client.js'

export function useTokenCounts(texts: string[], scope: string) {
  // Compare immutable strings without serializing all loaded history on each render.
  const [snapshot, setSnapshot] = useState(texts)
  if (snapshot.length !== texts.length || snapshot.some((text, index) => text !== texts[index])) setSnapshot(texts)
  const [composing, setComposing] = useState(false)
  const [result, setResult] = useState<{ scope: string; texts: string[]; counts?: number[]; error?: string }>()
  useEffect(() => {
    const start = () => setComposing(true)
    const end = () => setComposing(false)
    document.addEventListener('compositionstart', start)
    document.addEventListener('compositionend', end)
    return () => {
      document.removeEventListener('compositionstart', start)
      document.removeEventListener('compositionend', end)
    }
  }, [])
  useEffect(() => {
    if (composing) return
    const abort = new AbortController()
    const timer = window.setTimeout(() => {
      // Only the previous successful snapshot is retained; no growing history cache.
      const known = new Map(result?.counts?.map((count, index) => [result.texts[index]!, count]))
      const missing = [...new Set(snapshot.filter(text => !known.has(text)))]
      void countTexts(missing, abort.signal).then(
        counts => {
          if (abort.signal.aborted) return
          missing.forEach((text, index) => known.set(text, counts[index]!))
          setResult({ scope, texts: snapshot, counts: snapshot.map(text => known.get(text)!) })
        },
        error => { if (!abort.signal.aborted) setResult({ scope, texts: snapshot, error: String(error) }) },
      )
    }, 300)
    return () => { window.clearTimeout(timer); abort.abort() }
  }, [snapshot, scope, composing])
  const currentScope = result?.scope === scope ? result : undefined
  return {
    counts: currentScope?.counts,
    error: currentScope?.texts === snapshot ? currentScope.error : undefined,
    pending: composing || currentScope?.texts !== snapshot,
  }
}

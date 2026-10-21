import { NarrativeSessionPreview } from './narrative-session-preview.js'

// Explicit registration only. No business API, authentication, or persistent layout bootstrap.
export function DevPreview({ pathname }: { pathname: string }) {
  if (pathname === '/dev/preview/narrative-session') return <NarrativeSessionPreview />
  return null
}

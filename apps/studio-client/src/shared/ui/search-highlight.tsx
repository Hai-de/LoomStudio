import { buildSearchMatchPattern } from '../lib/search-match.js'

export function SearchHighlight({ text, query }: { text: string; query: string }) {
  const pattern = buildSearchMatchPattern(query)
  if (!pattern) return text
  return text.split(new RegExp(`(${pattern})`, 'giu'))
    .map((part, index) => index % 2 ? <mark key={index}>{part}</mark> : part)
}

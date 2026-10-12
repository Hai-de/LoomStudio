import { useEffect, useState } from 'react'
import type { CharacterCardSummary } from './character-card-summary.js'

type CardProfilePatch = { cardId: string; expectedVersion: number; name: string; userName: string; description: string; opening?: CharacterCardSummary['opening'] }

export function useCharacterProfileEditor({ selected, onUpdateCardProfile, refreshDetail, onRefreshCards }: {
  selected: CharacterCardSummary | undefined
  onUpdateCardProfile(patch: CardProfilePatch): Promise<unknown>
  refreshDetail(): Promise<unknown>
  onRefreshCards?(): Promise<unknown>
}) {
  const [nameDraft, setNameDraft] = useState('')
  const [authorDraft, setAuthorDraft] = useState('')
  const [descDraft, setDescDraft] = useState('')
  const [activeOpeningIndex, setActiveOpeningIndex] = useState(0)
  const [openingDraft, setOpeningDraft] = useState('')

  const totalOpenings = 1 + (selected?.opening?.alternatives?.length ?? 0)

  useEffect(() => {
    if (selected) {
      setNameDraft(selected.name ?? '')
      setAuthorDraft(selected.userName ?? '')
      setDescDraft(selected.description ?? '')
      setActiveOpeningIndex(prev => (prev < totalOpenings ? prev : 0))
    }
  }, [selected?.id, selected?.version])

  useEffect(() => {
    if (!selected?.opening) {
      setOpeningDraft('')
      return
    }
    if (activeOpeningIndex === 0) {
      setOpeningDraft(selected.opening.entries?.[0]?.content ?? '')
    } else {
      setOpeningDraft(selected.opening.alternatives?.[activeOpeningIndex - 1]?.entries?.[0]?.content ?? '')
    }
  }, [selected?.id, activeOpeningIndex, selected?.opening])

  async function saveCardField(patch: Partial<{ name: string; userName: string; description: string; opening: CharacterCardSummary['opening'] }>) {
    if (!selected) return
    try {
      await onUpdateCardProfile({
        cardId: selected.id,
        expectedVersion: selected.version,
        name: patch.name ?? selected.name,
        userName: patch.userName ?? (selected.userName ?? ''),
        description: patch.description ?? (selected.description ?? ''),
        opening: patch.opening !== undefined ? patch.opening : selected.opening,
      })
      await refreshDetail()
      await onRefreshCards?.()
    } catch (err) {
      console.error('Failed to update card profile', err)
    }
  }

  async function handleOpeningBlur() {
    if (!selected) return
    const currentContent = activeOpeningIndex === 0
      ? (selected.opening?.entries?.[0]?.content ?? '')
      : (selected.opening?.alternatives?.[activeOpeningIndex - 1]?.entries?.[0]?.content ?? '')
    if (openingDraft === currentContent) return

    let updatedOpening: CharacterCardSummary['opening']
    if (activeOpeningIndex === 0) {
      const existingEntries = selected.opening?.entries ?? []
      const newEntries = existingEntries.length > 0
        ? existingEntries.map((entry, idx) => idx === 0 ? { ...entry, content: openingDraft } : entry)
        : [{ role: 'assistant' as const, content: openingDraft }]
      updatedOpening = {
        ...selected.opening,
        entries: newEntries,
        alternatives: selected.opening?.alternatives ?? [],
      }
    } else {
      const altIdx = activeOpeningIndex - 1
      const currentAlts = selected.opening?.alternatives ?? []
      const targetAlt = currentAlts[altIdx]
      const newAltEntries = targetAlt?.entries?.length
        ? targetAlt.entries.map((entry, idx) => idx === 0 ? { ...entry, content: openingDraft } : entry)
        : [{ role: 'assistant' as const, content: openingDraft }]
      const newAlts = currentAlts.map((alt, idx) => idx === altIdx ? { ...alt, entries: newAltEntries } : alt)
      updatedOpening = {
        entries: selected.opening?.entries ?? [{ role: 'assistant' as const, content: '' }],
        alternatives: newAlts,
      }
    }
    await saveCardField({ opening: updatedOpening })
  }

  async function handleAddAlternative() {
    if (!selected) return
    const currentAlts = selected.opening?.alternatives ?? []
    const newAlts = [...currentAlts, { entries: [{ role: 'assistant' as const, content: '' }] }]
    const updatedOpening = {
      entries: selected.opening?.entries ?? [{ role: 'assistant' as const, content: '' }],
      alternatives: newAlts,
    }
    await saveCardField({ opening: updatedOpening })
    setActiveOpeningIndex(newAlts.length)
  }

  async function handleDeleteAlternative() {
    if (!selected || activeOpeningIndex === 0) return
    const altIdx = activeOpeningIndex - 1
    const currentAlts = selected.opening?.alternatives ?? []
    const newAlts = currentAlts.filter((_, idx) => idx !== altIdx)
    const updatedOpening = {
      entries: selected.opening?.entries ?? [{ role: 'assistant', content: '' }],
      alternatives: newAlts,
    }
    setActiveOpeningIndex(prev => Math.max(0, prev - 1))
    await saveCardField({ opening: updatedOpening })
  }

  return { nameDraft, setNameDraft, authorDraft, setAuthorDraft, descDraft, setDescDraft, activeOpeningIndex, setActiveOpeningIndex, openingDraft, setOpeningDraft, totalOpenings, saveCardField, handleOpeningBlur, handleAddAlternative, handleDeleteAlternative }
}

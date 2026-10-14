import { useId, useState } from 'react'
import { Check } from 'lucide-react'
import { Dialog, Textarea } from '@loom-studio/ui'
import type { Card } from '../../../entities/card.js'
import type { Translator } from '../../../shared/i18n/index.js'
import { SwipeControl } from '../../../shared/ui/swipe-control/swipe-control.js'
import type { OpeningChoice } from '../model/opening-choice.js'
import styles from './opening-picker.module.scss'

export function OpeningPicker(props: {
  opening: Card['opening']
  choice: OpeningChoice
  onChange(choice: OpeningChoice): void
  onApply?(): void
  disabled?: boolean
  t: Translator
}) {
  const [open, setOpen] = useState(false)
  const groupId = useId()
  const candidates = [props.opening, ...(props.opening.alternatives ?? [])]
  const count = candidates.length
  const choice = props.choice
  const selectedIndex = choice.kind === 'card' ? candidates.findIndex(candidate => candidate.id === choice.id) : -1
  const index = selectedIndex < 0 ? count : selectedIndex
  const choices: Array<{ choice: OpeningChoice; label: string }> = [
    ...candidates.map((candidate, index) => ({
      choice: { kind: 'card' as const, id: candidate.id },
      label: candidate.title || (index === 0 ? props.t('character.defaultOpening') : props.t('character.alternativeOpening') + ' ' + index),
    })),
    { choice: { kind: 'custom', content: '' }, label: props.t('character.customOpening') },
    { choice: { kind: 'empty' }, label: props.t('character.emptyOpening') },
  ]
  return <div className={styles.picker}>
    <SwipeControl index={index} count={count + (selectedIndex < 0 ? 1 : 0)} disabled={props.disabled}
      previousLabel={props.t('character.previousOpening')} nextLabel={props.t('character.nextOpening')}
      chooseLabel={props.t('character.chooseOpening')}
      onPrevious={() => props.onChange({ kind: 'card', id: candidates[index - 1].id })}
      onNext={() => props.onChange({ kind: 'card', id: candidates[index + 1].id })}
      onChoose={() => setOpen(true)} />
    <Dialog open={open} title={props.t('character.chooseOpening')} onClose={() => setOpen(false)}>
      <div className={styles.choices}>
        {choices.map(({ choice, label }) => {
          const selected = choice.kind === props.choice.kind
            && (choice.kind !== 'card' || (props.choice.kind === 'card' && choice.id === props.choice.id))
          return <label className={styles.option} key={choice.kind === 'card' ? choice.id : choice.kind}>
            <input type="radio" name={groupId} checked={selected} disabled={props.disabled}
              onChange={() => {
                props.onChange(choice)
                if (choice.kind !== 'custom') setOpen(false)
              }} />
            <span>{label}</span>
          </label>
        })}
      </div>
      {props.choice.kind === 'custom' ? <div className={styles.custom}>
        <Textarea aria-label={props.t('character.customOpening')}
          disabled={props.disabled} value={props.choice.content}
          onChange={event => props.onChange({ kind: 'custom', content: event.target.value })} />
        {props.onApply ? <button type="button" disabled={props.disabled}
          title={props.t('character.applyOpening')} aria-label={props.t('character.applyOpening')}
          onClick={props.onApply}><Check size={18} aria-hidden="true" /></button> : null}
      </div> : null}
    </Dialog>
  </div>
}

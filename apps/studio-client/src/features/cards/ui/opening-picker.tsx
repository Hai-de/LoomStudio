import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Textarea } from '@loom-studio/ui'
import type { Card } from '../../../entities/card.js'
import type { Translator } from '../../../shared/i18n/index.js'
import type { OpeningChoice } from '../model/opening-choice.js'
import styles from './opening-picker.module.scss'

export function OpeningPicker(props: {
  opening: Card['opening']
  choice: OpeningChoice
  onChange(choice: OpeningChoice): void
  disabled?: boolean
  t: Translator
}) {
  const count = 1 + (props.opening.alternatives?.length ?? 0)
  return <div className={styles.picker}>
    <div className={styles.toolbar}>
      <select aria-label={props.t('character.chooseOpening')} disabled={props.disabled}
        value={props.choice.kind === 'card' ? String(props.choice.index) : props.choice.kind}
        onChange={event => props.onChange(event.target.value === 'custom'
          ? { kind: 'custom', content: '' }
          : event.target.value === 'empty' ? { kind: 'empty' } : { kind: 'card', index: Number(event.target.value) })}>
        <option value="0">{props.t('character.defaultOpening')}</option>
        {props.opening.alternatives?.map((_, index) => <option key={index} value={index + 1}>
          {props.t('character.alternativeOpening')} {index + 1}
        </option>)}
        <option value="custom">{props.t('character.customOpening')}</option>
        <option value="empty">{props.t('character.emptyOpening')}</option>
      </select>
      {props.choice.kind === 'card' && count > 1 ? <>
        <button type="button" disabled={props.disabled || props.choice.index === 0}
          title={props.t('character.previousOpening')} aria-label={props.t('character.previousOpening')}
          onClick={() => props.choice.kind === 'card' && props.onChange({ kind: 'card', index: props.choice.index - 1 })}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <span className={styles.counter}>{props.choice.index + 1} / {count}</span>
        <button type="button" disabled={props.disabled || props.choice.index === count - 1}
          title={props.t('character.nextOpening')} aria-label={props.t('character.nextOpening')}
          onClick={() => props.choice.kind === 'card' && props.onChange({ kind: 'card', index: props.choice.index + 1 })}>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </> : null}
    </div>
    {props.choice.kind === 'custom' ? <Textarea aria-label={props.t('character.customOpening')}
      disabled={props.disabled} value={props.choice.content}
      onChange={event => props.onChange({ kind: 'custom', content: event.target.value })} /> : null}
  </div>
}

import { useId, useState } from 'react'
import { Dialog } from '@loom-studio/ui'
import { Plus } from 'lucide-react'
import type { NarrativeSwipeView } from '../model/use-narrative-runtime.js'
import type { Translator } from '../../../shared/i18n/index.js'
import { SwipeControl } from '../../../shared/ui/swipe-control/swipe-control.js'
import { ConversationMessageAction } from '../../../shared/ui/conversation-message-chrome/conversation-message-chrome.js'
import styles from '../../cards/ui/opening-picker.module.scss'

export function NarrativeInputSwipePicker(props: {
  swipe: NarrativeSwipeView
  disabled: boolean
  onEdit(): void
  onSelect(candidateId: string): void
  t: Translator
}) {
  const [open, setOpen] = useState(false)
  const name = useId()
  const inputs = props.swipe.inputs ?? []
  const index = inputs.findIndex(input => input.nodeId === props.swipe.inputNodeId)
  if (index < 0) return null
  const disabled = props.disabled || props.swipe.active || props.swipe.suspended || !props.swipe.canSelect
  const select = (position: number) => {
    const candidateId = inputs[position]?.selectedCandidateId
    if (candidateId) props.onSelect(candidateId)
  }
  return <>
    <ConversationMessageAction disabled={disabled || !props.swipe.canGenerate} label={props.t('swipe.editInput')} onClick={props.onEdit}>
      <Plus aria-hidden="true" />
    </ConversationMessageAction>
    <SwipeControl index={index} count={inputs.length} disabled={disabled}
      previousLabel={props.t('swipe.previous')} nextLabel={props.t(index === inputs.length - 1 ? 'swipe.editInput' : 'swipe.next')}
      chooseLabel={props.t('swipe.chooseInput')}
      onPrevious={() => select(index - 1)} onNext={() => select(index + 1)}
      onGenerateNext={props.swipe.canGenerate ? props.onEdit : undefined} onChoose={() => setOpen(true)} />
    <Dialog open={open} title={props.t('swipe.chooseInput')} onClose={() => setOpen(false)}>
      <div className={styles.choices}>{inputs.map((input, position) => <label key={input.nodeId} className={styles.option}>
        <input type="radio" name={name} checked={position === index} disabled={disabled || !input.selectedCandidateId}
          onChange={() => { select(position); setOpen(false) }} />
        <span>{position + 1}. {input.input}</span>
      </label>)}</div>
    </Dialog>
  </>
}

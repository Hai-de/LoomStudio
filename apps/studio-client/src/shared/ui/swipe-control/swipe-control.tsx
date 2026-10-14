import { ChevronLeft, ChevronRight } from 'lucide-react'
import styles from './swipe-control.module.scss'

export function SwipeControl(props: {
  index: number
  count: number
  disabled?: boolean
  previousLabel: string
  nextLabel: string
  chooseLabel: string
  onPrevious(): void
  onNext(): void
  onChoose(): void
}) {
  return <div className={styles.control}>
    <button type="button" disabled={props.disabled || props.index === 0}
      title={props.previousLabel} aria-label={props.previousLabel} onClick={props.onPrevious}>
      <ChevronLeft size={18} aria-hidden="true" />
    </button>
    <button type="button" className={styles.counter} disabled={props.disabled}
      title={props.chooseLabel} aria-label={`${props.chooseLabel} (${props.index + 1}/${props.count})`}
      aria-haspopup="dialog" onClick={props.onChoose}>
      {props.index + 1}/{props.count}
    </button>
    <button type="button" disabled={props.disabled || props.index === props.count - 1}
      title={props.nextLabel} aria-label={props.nextLabel} onClick={props.onNext}>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  </div>
}

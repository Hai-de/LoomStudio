import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, className, style, id, ...props }, ref) {
  const input = <input ref={ref} data-loom-ui-checkbox="" id={id} {...props} type="checkbox" />
  if (!label) return input
  return (
    <label className={className} data-loom-ui-choice-label="" style={style}>
      {input}
      <span data-loom-ui-choice-text="">{label}</span>
    </label>
  )
})


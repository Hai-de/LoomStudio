import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

export type RadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: ReactNode
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio({ label, className, style, id, ...props }, ref) {
  const input = <input ref={ref} data-loom-ui-radio="" id={id} {...props} type="radio" />
  if (!label) return input
  return (
    <label className={className} data-loom-ui-choice-label="" style={style}>
      {input}
      <span data-loom-ui-choice-text="">{label}</span>
    </label>
  )
})

export type RadioGroupOption<T extends string = string> = {
  value: T
  label: ReactNode
  disabled?: boolean
}

export type RadioGroupProps<T extends string = string> = {
  name: string
  value: T
  options: ReadonlyArray<RadioGroupOption<T>>
  onChange(value: T): void
  className?: string
  disabled?: boolean
  direction?: 'horizontal' | 'vertical'
}

export function RadioGroup<T extends string = string>(props: RadioGroupProps<T>) {
  return (
    <div
      className={props.className}
      data-direction={props.direction ?? 'horizontal'}
      data-loom-ui-radio-group=""
      role="radiogroup"
    >
      {props.options.map(option => (
        <Radio
          checked={props.value === option.value}
          disabled={props.disabled || option.disabled}
          key={option.value}
          label={option.label}
          name={props.name}
          value={option.value}
          onChange={() => props.onChange(option.value)}
        />
      ))}
    </div>
  )
}

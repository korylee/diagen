import type { JSX } from 'solid-js'

interface NumberFieldProps {
  label: string
  value: number | undefined
  disabled?: boolean
  min?: number
  step?: number
  placeholder?: string
  onInput: (value: number) => void
}

export function NumberField(props: NumberFieldProps): JSX.Element {
  return (
    <label class="dg-inspector__field">
      <span class="dg-inspector__field-label">{props.label}</span>
      <input
        class="dg-inspector__input"
        type="number"
        value={props.value ?? ''}
        disabled={props.disabled}
        min={props.min}
        step={props.step}
        placeholder={props.placeholder}
        onInput={event => props.onInput(event.currentTarget.valueAsNumber)}
      />
    </label>
  )
}

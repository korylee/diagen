import type { JSX } from 'solid-js'

interface ColorFieldProps {
  label: string
  value: string | undefined
  disabled?: boolean
  placeholder?: string
  onInput: (value: string) => void
}

export function ColorField(props: ColorFieldProps): JSX.Element {
  return (
    <label class="dg-inspector__field">
      <span class="dg-inspector__field-label">{props.label}</span>
      <input
        class="dg-inspector__input"
        type="text"
        value={props.value ?? ''}
        disabled={props.disabled}
        placeholder={props.placeholder ?? '50,50,50'}
        onInput={event => props.onInput(event.currentTarget.value)}
      />
    </label>
  )
}

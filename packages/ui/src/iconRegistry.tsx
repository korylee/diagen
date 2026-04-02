import type { JSX } from 'solid-js'
import type { IconProps } from '@diagen/icons'
import { Delete, Batch, Fit, Group, IconBase, Linker, Redo, Undo, Ungroup, ZoomIn, ZoomOut } from '@diagen/icons'
import { keys, type KeyOf } from '@diagen/shared'

export interface Icon {
  (props: IconProps): JSX.Element
}

function CreateSingleIcon(props: IconProps): JSX.Element {
  return (
    <IconBase {...props} viewBox="0 0 16 16">
      <rect x="2.5" y="3" width="6.5" height="6.5" rx="1.25" />
      <path d="M11.5 5.5v6" />
      <path d="M8.5 8.5h6" />
    </IconBase>
  )
}

export const defaultIconRegistry = {
  linker: Linker,
  undo: Undo,
  redo: Redo,
  group: Group,
  ungroup: Ungroup,
  delete: Delete,
  'zoom-out': ZoomOut,
  fit: Fit,
  'zoom-in': ZoomIn,
  connect: Linker,
  'create-single': CreateSingleIcon,
  'create-batch': Batch,
} as const

export type IconKey = KeyOf<typeof defaultIconRegistry>

export type IconRegistry = Record<IconKey, Icon>

export type IconRegistryOverrides = Partial<IconRegistry>

export function createIconRegistry(overrides: IconRegistryOverrides = {}): IconRegistry {
  const next: IconRegistry = { ...defaultIconRegistry }

  for (const key of keys(overrides)) {
    const override = overrides[key]
    if (!override) {
      continue
    }

    next[key] = override || next[key]
  }

  return next
}

export function renderIcon(
  key: IconKey | undefined,
  registry: IconRegistry = defaultIconRegistry,
  props: IconProps = {},
) {
  if (!key) {
    return undefined
  }

  return registry[key]?.(props)
}

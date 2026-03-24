import type { JSX } from 'solid-js'
import type { IconProps } from '@diagen/icons'
import {
  DeleteIcon,
  FitIcon,
  GroupIcon,
  LinkerIcon,
  RectangleIcon,
  RedoIcon,
  UndoIcon,
  UngroupIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from '@diagen/icons'

export type DesignerIconKey =
  | 'shape-rectangle'
  | 'linker'
  | 'undo'
  | 'redo'
  | 'group'
  | 'ungroup'
  | 'delete'
  | 'zoom-out'
  | 'fit'
  | 'zoom-in'
  | 'quick-rectangle'
  | 'connect'

export interface DesignerIconDescriptor {
  icon?: (props: IconProps) => JSX.Element
}

export type DesignerIconRegistry = Record<DesignerIconKey, DesignerIconDescriptor>

export type DesignerIconRegistryOverrides = Partial<Record<DesignerIconKey, Partial<DesignerIconDescriptor>>>

export const defaultDesignerIconRegistry: DesignerIconRegistry = {
  'shape-rectangle': {
    icon: RectangleIcon,
  },
  linker: {
    icon: LinkerIcon,
  },
  undo: {
    icon: UndoIcon,
  },
  redo: {
    icon: RedoIcon,
  },
  group: {
    icon: GroupIcon,
  },
  ungroup: {
    icon: UngroupIcon,
  },
  delete: {
    icon: DeleteIcon,
  },
  'zoom-out': {
    icon: ZoomOutIcon,
  },
  fit: {
    icon: FitIcon,
  },
  'zoom-in': {
    icon: ZoomInIcon,
  },
  'quick-rectangle': {
    icon: RectangleIcon,
  },
  connect: {
    icon: LinkerIcon,
  },
}

export function createDesignerIconRegistry(overrides: DesignerIconRegistryOverrides = {}): DesignerIconRegistry {
  const next = { ...defaultDesignerIconRegistry }

  for (const key of Object.keys(overrides) as DesignerIconKey[]) {
    const override = overrides[key]
    if (!override) {
      continue
    }

    next[key] = {
      ...next[key],
      ...override,
    }
  }

  return next
}

export function renderDesignerIcon(
  key: DesignerIconKey | undefined,
  registry: DesignerIconRegistry = defaultDesignerIconRegistry,
  props: IconProps = {},
): JSX.Element | undefined {
  if (!key) {
    return undefined
  }

  const icon = registry[key]?.icon
  return icon ? icon(props) : undefined
}

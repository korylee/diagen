import { resolveRendererDefaults, type RendererDefaults, type RendererDefaultsOverrides } from '@diagen/renderer'
import type { ActionEntry } from './actions'
import type { ContextMenuTargetType } from './editor/contextMenu/types'
import type { IconRegistryOverrides } from './iconRegistry'

export interface UiContextMenuDefaults {
  canvas: readonly ActionEntry[]
  element: readonly ActionEntry[]
  linker: readonly ActionEntry[]
}

export interface UiSidebarDefaults {
  searchPlaceholder: string
  emptyText: string
}

export interface UiDefaults {
  toolbarEntries: readonly (ActionEntry | 'spacer')[]
  contextMenuEntries: UiContextMenuDefaults
  iconRegistry: IconRegistryOverrides
  sidebar: UiSidebarDefaults
}

export interface UiDefaultsOverrides {
  toolbarEntries?: readonly (ActionEntry | 'spacer')[]
  contextMenuEntries?: Partial<UiContextMenuDefaults>
  iconRegistry?: IconRegistryOverrides
  sidebar?: Partial<UiSidebarDefaults>
}

export interface DiagenDefaults {
  renderer: RendererDefaults
  ui: UiDefaults
}

export interface DiagenDefaultsOverrides {
  renderer?: RendererDefaultsOverrides
  ui?: UiDefaultsOverrides
}

export const UI_DEFAULTS: UiDefaults = {
  toolbarEntries: [
    'history:undo',
    'history:redo',
    '|',
    'arrange:group',
    'arrange:ungroup',
    'edit:delete',
    '|',
    'view:zoom-out',
    'view:fit',
    'view:zoom-in',
  ] as const,
  contextMenuEntries: {
    canvas: ['clipboard:paste', '|', 'history:undo', 'history:redo', '|', 'view:fit'] as const,
    element: [
      'clipboard:copy',
      'clipboard:cut',
      'clipboard:paste',
      'clipboard:duplicate',
      '|',
      'arrange:group',
      'arrange:ungroup',
      'edit:delete',
      '|',
      'history:undo',
      'history:redo',
      '|',
      'view:fit',
    ] as const,
    linker: [
      'clipboard:copy',
      'clipboard:cut',
      'clipboard:paste',
      'clipboard:duplicate',
      '|',
      'edit:delete',
      '|',
      'history:undo',
      'history:redo',
      '|',
      'view:fit',
    ] as const,
  },
  iconRegistry: {},
  sidebar: {
    searchPlaceholder: 'Search',
    emptyText: 'No items',
  },
}

function resolveUiContextMenuDefaults(overrides?: UiDefaultsOverrides['contextMenuEntries']): UiContextMenuDefaults {
  // 菜单分场景独立替换，避免数组级 merge 造成菜单顺序与分隔符失真。
  return {
    canvas: overrides?.canvas ?? UI_DEFAULTS.contextMenuEntries.canvas,
    element: overrides?.element ?? UI_DEFAULTS.contextMenuEntries.element,
    linker: overrides?.linker ?? UI_DEFAULTS.contextMenuEntries.linker,
  }
}

export function resolveUiDefaults(overrides?: UiDefaultsOverrides): UiDefaults {
  return {
    toolbarEntries: overrides?.toolbarEntries ?? UI_DEFAULTS.toolbarEntries,
    contextMenuEntries: resolveUiContextMenuDefaults(overrides?.contextMenuEntries),
    iconRegistry: {
      ...UI_DEFAULTS.iconRegistry,
      ...overrides?.iconRegistry,
    },
    sidebar: {
      ...UI_DEFAULTS.sidebar,
      ...overrides?.sidebar,
    },
  }
}

export function resolveDiagenDefaults(overrides?: DiagenDefaultsOverrides): DiagenDefaults {
  // renderer 与 ui 分层解析，保证默认值来源清晰，便于后续扩展到更多域。
  return {
    renderer: resolveRendererDefaults(overrides?.renderer),
    ui: resolveUiDefaults(overrides?.ui),
  }
}

export function getContextMenuDefaultEntries(targetType: ContextMenuTargetType, defaults: UiContextMenuDefaults): readonly ActionEntry[] {
  if (targetType === 'canvas') return defaults.canvas
  if (targetType === 'linker') return defaults.linker
  return defaults.element
}

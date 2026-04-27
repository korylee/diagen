import { resolveRendererDefaults, type RendererDefaults, type RendererDefaultsOverrides } from '@diagen/renderer'
import type { ActionEntry, UIAction } from './actions'
import type { ContextMenuTargetType } from './editor/contextMenu/types'
import type { IconRegistryOverrides } from './iconRegistry'

export interface UiContextMenuDefaults {
  canvas: readonly (ActionEntry | UIAction)[]
  element: readonly (ActionEntry | UIAction)[]
  linker: readonly (ActionEntry | UIAction)[]
  selection: readonly (ActionEntry | UIAction)[]
}

export interface UiSidebarDefaults {
  searchPlaceholder: string
  emptyText: string
}

export interface ToolbarDefaults {
  entries: readonly (ActionEntry | 'spacer')[]
}

export interface UiDefaults {
  toolbar: ToolbarDefaults
  contextMenu: { entries: UiContextMenuDefaults }
  iconRegistry: IconRegistryOverrides
  sidebar: UiSidebarDefaults
}

export interface UiDefaultsOverrides {
  toolbar?: { entries?: readonly (ActionEntry | 'spacer')[] }
  contextMenu?: { entries?: Partial<UiContextMenuDefaults> }
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

const CONTEXT_MENU_DEFAULT = {
  entries: {
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
      'view:fit-selection',
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
    selection: [
      'clipboard:copy',
      'clipboard:cut',
      'clipboard:paste',
      'clipboard:duplicate',
      '|',
      'arrange:group',
      'edit:delete',
      '|',
      'history:undo',
      'history:redo',
      '|',
      'view:fit-selection',
    ] as const,
  },
}

export const UI_DEFAULTS: UiDefaults = {
  toolbar: {
    entries: [
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
  },
  contextMenu: CONTEXT_MENU_DEFAULT,
  iconRegistry: {},
  sidebar: {
    searchPlaceholder: 'Search',
    emptyText: 'No items',
  },
}

export function resolveUiDefaults(overrides?: UiDefaultsOverrides): UiDefaults {
  // 菜单分场景独立替换，避免数组级 merge 造成菜单顺序与分隔符失真。
  const ctx = overrides?.contextMenu?.entries
  return {
    toolbar: {
      entries: overrides?.toolbar?.entries ?? UI_DEFAULTS.toolbar.entries,
    },
    contextMenu: {
      entries: {
        canvas: ctx?.canvas ?? UI_DEFAULTS.contextMenu.entries.canvas,
        element: ctx?.element ?? UI_DEFAULTS.contextMenu.entries.element,
        linker: ctx?.linker ?? UI_DEFAULTS.contextMenu.entries.linker,
        selection: ctx?.selection ?? UI_DEFAULTS.contextMenu.entries.selection,
      },
    },
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

export function getContextMenuDefaultEntries(
  targetType: ContextMenuTargetType,
  defaults: UiContextMenuDefaults,
): readonly (ActionEntry | UIAction)[] {
  if (targetType === 'canvas') return defaults.canvas
  if (targetType === 'linker') return defaults.linker
  if (targetType === 'selection') return defaults.selection
  return defaults.element
}

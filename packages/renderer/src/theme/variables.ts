// ============================================================================
// 类型定义
// ============================================================================

import type { ValueOf } from "@diagen/shared"

const ALL_THEME_VARS = [
  '--dg-selection-color',
  '--dg-selection-border',
  '--dg-selection-background',
  '--dg-anchor-size',
  '--dg-anchor-color',
  '--dg-anchor-background',
  '--dg-anchor-border',
  '--dg-anchor-radius',
  '--dg-handle-size',
  '--dg-handle-color',
  '--dg-handle-background',
  '--dg-handle-border',
  '--dg-rotate-size',
  '--dg-rotate-color',
  '--dg-rotate-background',
  '--dg-rotate-border',
  '--dg-boxselect-border',
  '--dg-boxselect-background',
  '--dg-grid-color',
  '--dg-grid-color-alt',
  '--dg-page-background',
  '--dg-page-shadow',
  '--dg-linker-color',
  '--dg-linker-color-inactive',
  '--dg-cursor-grab',
  '--dg-cursor-grabbing',
] as const

export type ThemeVarName = ValueOf<typeof ALL_THEME_VARS>

export type ThemeVars = Record<ThemeVarName, string>

// ============================================================================
// 主题工具函数
// ============================================================================

/** 应用主题到 DOM 根元素 */
export function applyTheme(root: HTMLElement, theme: Partial<ThemeVars>): void {
  for (const [key, value] of Object.entries(theme)) {
    if (value) {
      root.style.setProperty(key, value)
    }
  }
}

/** 重置为默认主题 */
export function resetTheme(root: HTMLElement): void {
  for (const key of ALL_THEME_VARS) {
    root.style.removeProperty(key)
  }
}

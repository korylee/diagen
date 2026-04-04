const THEME_VAR_PREFIX = '--dg-'

export type ThemeVarName = `--dg-${string}`

export type ThemeVars = Record<ThemeVarName, string>

export function isThemeVarName(value: string): value is ThemeVarName {
  return value.startsWith(THEME_VAR_PREFIX)
}

export function applyTheme(root: HTMLElement, theme: Partial<ThemeVars>, appliedKeys?: Set<ThemeVarName>): void {
  for (const [key, value] of Object.entries(theme)) {
    if (!isThemeVarName(key)) {
      continue
    }

    if (value !== undefined && value !== null && value !== '') {
      root.style.setProperty(key, value)
      appliedKeys?.add(key)
    }
  }
}

export function resetTheme(root: HTMLElement, appliedKeys?: Iterable<ThemeVarName>): void {
  if (!appliedKeys) {
    return
  }

  for (const key of appliedKeys) {
    root.style.removeProperty(key)
  }
}

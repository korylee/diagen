import { createContext, createEffect, type JSX, useContext } from 'solid-js'
import { applyTheme, resetTheme, type ThemeVars } from './theme'

interface ThemeContextValue {
  setTheme: (theme: Partial<ThemeVars>) => void
  reset: () => void
}

const ThemeContext = createContext<ThemeContextValue>()

export interface ThemeProviderProps {
  children: JSX.Element
  theme?: Partial<ThemeVars>
  useDefault?: boolean
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}

export function ThemeProvider(props: ThemeProviderProps) {
  let rootRef: HTMLDivElement | undefined
  const appliedKeys = new Set<`--dg-${string}`>()

  const setTheme = (theme: Partial<ThemeVars>) => {
    if (rootRef) {
      applyTheme(rootRef, theme, appliedKeys)
    }
  }

  const reset = () => {
    if (rootRef) {
      resetTheme(rootRef, appliedKeys)
      appliedKeys.clear()
    }
  }

  createEffect(() => {
    if (!rootRef) {
      return
    }

    resetTheme(rootRef, appliedKeys)
    appliedKeys.clear()

    if (props.theme) {
      applyTheme(rootRef, props.theme, appliedKeys)
    }
  })

  return (
    <ThemeContext.Provider value={{ setTheme, reset }}>
      <div
        ref={rootRef}
        style={{
          display: 'contents',
        }}
      >
        {props.children}
      </div>
    </ThemeContext.Provider>
  )
}

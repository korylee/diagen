import { createContext, createEffect, JSX, onCleanup, useContext } from 'solid-js'
import { applyTheme, resetTheme, ThemeVars } from '../theme'

// ============================================================================
// Theme Context
// ============================================================================

interface ThemeContextValue {
  /** 更新主题 */
  setTheme: (theme: Partial<ThemeVars>) => void
  /** 重置为默认主题 */
  reset: () => void
}

const ThemeContext = createContext<ThemeContextValue>()

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

// ============================================================================
// Theme Provider
// ============================================================================

export interface ThemeProviderProps {
  children: JSX.Element
  /** 初始主题配置 */
  theme?: Partial<ThemeVars>
  /** 是否使用默认主题（默认 true） */
  useDefault?: boolean
}

export function ThemeProvider(props: ThemeProviderProps) {
  let rootRef: HTMLDivElement | undefined

  const setTheme = (theme: Partial<ThemeVars>) => {
    if (rootRef) applyTheme(rootRef, theme)
  }

  const reset = () => {
    if (rootRef) resetTheme(rootRef)
  }

  createEffect(() => {
    if (rootRef && props.theme) {
      applyTheme(rootRef, props.theme)
    }
  })

  onCleanup(() => {
    // 清理时无需重置，由父组件决定
  })

  return (
    <ThemeContext.Provider value={{ setTheme, reset }}>
      <div
        ref={rootRef}
        style={{
          // 确保变量可被继承
          display: 'contents',
        }}
      >
        {props.children}
      </div>
    </ThemeContext.Provider>
  )
}

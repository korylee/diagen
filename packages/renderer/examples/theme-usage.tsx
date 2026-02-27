/**
 * ThemeProvider 使用示例
 */

import { createSignal } from 'solid-js'
import type { JSX } from 'solid-js'
import { ThemeProvider, useTheme } from '../src/index'

// RendererContainer 占位，实际使用时替换为你的容器组件
function RendererContainer(props: { children: JSX.Element }) {
  return <div style="width: 100%; height: 100%;">{props.children}</div>
}

// 示例 1: 基础用法 - 使用默认主题
function BasicExample() {
  return (
    <ThemeProvider>
      <RendererContainer>
        {/* 你的图形元素 */}
      </RendererContainer>
    </ThemeProvider>
  )
}

// 示例 2: 自定义主题
function CustomThemeExample() {
  return (
    <ThemeProvider
      theme={{
        selection: {
          color: '#ff5722',
          border: '2px solid #ff5722',
        },
        anchor: {
          size: '10px',
          color: '#4caf50',
        },
        page: {
          background: '#fafafa',
        },
      }}
    >
      <RendererContainer>
        {/* 你的图形元素 */}
      </RendererContainer>
    </ThemeProvider>
  )
}

// 示例 3: 动态切换主题
function DynamicThemeExample() {
  const [darkMode, setDarkMode] = createSignal(false)

  const theme = () => ({
    selection: {
      color: darkMode() ? '#90caf9' : '#2196f3',
    },
    page: {
      background: darkMode() ? '#1e1e1e' : '#ffffff',
    },
    grid: {
      color: darkMode() ? 'rgb(50, 50, 50)' : 'rgb(242, 242, 242)',
    },
  })

  return (
    <ThemeProvider theme={theme()}>
      <button onClick={() => setDarkMode(!darkMode())}>
        {darkMode() ? '切换到亮色' : '切换到暗色'}
      </button>
      <RendererContainer>
        {/* 你的图形元素 */}
      </RendererContainer>
    </ThemeProvider>
  )
}

// 示例 4: 在组件中使用 useTheme
function ThemedComponent() {
  const theme = useTheme()

  return (
    <div>
      <button onClick={() => theme.setTheme({ selection: { color: '#ff0000' } })}>
        改为红色选中框
      </button>
      <button onClick={() => theme.reset()}>重置主题</button>
    </div>
  )
}

export default function App() {
  return (
    <div style="height: 100vh;">
      <BasicExample />
      {/* 或 */}
      <CustomThemeExample />
      {/* 或 */}
      <DynamicThemeExample />
    </div>
  )
}

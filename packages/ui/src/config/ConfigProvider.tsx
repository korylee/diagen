import type { Accessor } from 'solid-js'
import { createContext, createMemo, splitProps, useContext } from 'solid-js'
import { DesignerProvider, useDesignerContext } from '@diagen/renderer'
import type { UIActions } from '../actions'
import { createActions } from '../actions'
import { createIconRegistry, defaultIconRegistry, type IconRegistry } from '../iconRegistry'
import type { DiagenProviderProps, UIConfigProviderProps } from './types'
import { ThemeProvider } from './ThemeProvider'

interface UIConfigContextValue {
  iconRegistry: Accessor<IconRegistry>
  actions: Accessor<UIActions | undefined>
}

const UIConfigContext = createContext<UIConfigContextValue>()

export function UIConfigProvider(props: UIConfigProviderProps) {
  const [local] = splitProps(props, ['designer', 'iconRegistry', 'actions', 'children'])
  const contextDesigner = useDesignerContext()
  const resolvedDesigner = createMemo(() => local.designer ?? contextDesigner)
  const iconRegistry = createMemo(() => createIconRegistry(local.iconRegistry))
  const actions = createMemo<UIActions | undefined>(() => {
    const designer = resolvedDesigner()
    const defaultActions = designer ? createActions(designer) : undefined

    if (!local.actions) {
      return defaultActions
    }

    return typeof local.actions === 'function'
      ? local.actions({
          designer,
          defaultActions,
        })
      : local.actions
  })

  return (
    <UIConfigContext.Provider
      value={{
        iconRegistry,
        actions,
      }}
    >
      {local.children}
    </UIConfigContext.Provider>
  )
}

export function DiagenProvider(props: DiagenProviderProps) {
  const [local] = splitProps(props, ['designer', 'theme', 'iconRegistry', 'actions', 'children'])

  return (
    <DesignerProvider designer={local.designer}>
      <ThemeProvider theme={local.theme}>
        <UIConfigProvider designer={local.designer} iconRegistry={local.iconRegistry} actions={local.actions}>
          {local.children}
        </UIConfigProvider>
      </ThemeProvider>
    </DesignerProvider>
  )
}

export function useUIConfig() {
  return useContext(UIConfigContext)
}

export function useUIIconRegistry(): Accessor<IconRegistry> {
  const config = useUIConfig()
  return () => config?.iconRegistry() ?? defaultIconRegistry
}

export function useUIActions(): Accessor<UIActions | undefined> {
  const config = useUIConfig()
  return () => config?.actions()
}

import { DesignerProvider, useDesignerContext } from '@diagen/renderer'
import type { Accessor } from 'solid-js'
import { createContext, createMemo, splitProps, useContext } from 'solid-js'
import type { UIActions } from '../actions'
import { createActions } from '../actions'
import { resolveDiagenDefaults, type DiagenDefaults } from '../defaults'
import { createIconRegistry, defaultIconRegistry, type IconRegistry } from '../iconRegistry'
import { ThemeProvider } from './ThemeProvider'
import type { DiagenProviderProps, UIConfigProviderProps } from './types'

interface UIConfigContextValue {
  iconRegistry: Accessor<IconRegistry>
  actions: Accessor<UIActions | undefined>
  defaults: Accessor<DiagenDefaults>
}

const UIConfigContext = createContext<UIConfigContextValue>()
const fallbackDefaults = resolveDiagenDefaults()

export function UIConfigProvider(props: UIConfigProviderProps) {
  const [local] = splitProps(props, ['designer', 'iconRegistry', 'actions', 'defaults', 'children'])
  const contextDesigner = useDesignerContext()
  const resolvedDesigner = createMemo(() => local.designer ?? contextDesigner)
  const defaults = createMemo(() => resolveDiagenDefaults(local.defaults))
  const iconRegistry = createMemo(() =>
    createIconRegistry({
      ...defaults().ui.iconRegistry,
      ...local.iconRegistry,
    }),
  )
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
        defaults,
      }}
    >
      {local.children}
    </UIConfigContext.Provider>
  )
}

export function DiagenProvider(props: DiagenProviderProps) {
  const [local] = splitProps(props, ['designer', 'theme', 'iconRegistry', 'actions', 'defaults', 'children'])

  return (
    <DesignerProvider designer={local.designer}>
      <ThemeProvider theme={local.theme}>
        <UIConfigProvider
          designer={local.designer}
          iconRegistry={local.iconRegistry}
          actions={local.actions}
          defaults={local.defaults}
        >
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

export function useUIDefaults(): Accessor<DiagenDefaults> {
  const config = useUIConfig()
  return () => config?.defaults() ?? fallbackDefaults
}

import type { Designer } from '@diagen/core'
import type { JSX } from 'solid-js'
import type { UIActions } from '../actions'
import type { IconRegistryOverrides } from '../iconRegistry'
import type { ThemeVars } from './theme'

export interface UIConfig {
  iconRegistry?: IconRegistryOverrides
  actions?: UIActions | UIActionsFactory
}

export interface UIActionsFactoryInput {
  designer?: Designer
  defaultActions?: UIActions
}

export type UIActionsFactory = (input: UIActionsFactoryInput) => UIActions

export interface UIConfigProviderProps extends UIConfig {
  designer?: Designer
  children: JSX.Element
}

export interface DiagenProviderProps extends UIConfig {
  designer: Designer
  theme?: Partial<ThemeVars>
  children: JSX.Element
}

/**
 * Store Provider
 * Provides Designer instance to the component tree via SolidJS Context
 */

import { createContext, useContext, type JSX } from 'solid-js'
import type { Designer } from '@diagen/core'

const DesignerContext = createContext<Designer>()

export interface DesignerProviderProps {
  designer: Designer
  children: JSX.Element
}

/**
 * Store Provider Component
 * Wraps the application to provide Designer access to all child components
 */
export function DesignerProvider(props: DesignerProviderProps) {
  return (
    <DesignerContext.Provider value={props.designer}>
      {props.children}
    </DesignerContext.Provider>
  )
}

/**
 * Hook to access the Designer from context
 * Must be used within a DesignerProvider
 */
export function useDesigner(): Designer {
  const designer = useContext(DesignerContext)
  if (!designer) {
    throw new Error('useDesignerFromContext must be used within a DesignerProvider')
  }
  return designer
}

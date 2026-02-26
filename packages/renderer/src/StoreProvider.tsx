/**
 * Store Provider
 * Provides DesignerStore instance to the component tree via SolidJS Context
 */

import { createContext, useContext, type JSX } from 'solid-js'
import type { DesignerStore } from '@diagen/core'

const StoreContext = createContext<DesignerStore>()

export interface StoreProviderProps {
  store: DesignerStore
  children: JSX.Element
}

/**
 * Store Provider Component
 * Wraps the application to provide DesignerStore access to all child components
 */
export function StoreProvider(props: StoreProviderProps) {
  return (
    <StoreContext.Provider value={props.store}>
      {props.children}
    </StoreContext.Provider>
  )
}

/**
 * Hook to access the DesignerStore from context
 * Must be used within a StoreProvider
 */
export function useStore(): DesignerStore {
  const store = useContext(StoreContext)
  if (!store) {
    throw new Error('useStoreFromContext must be used within a StoreProvider')
  }
  return store
}

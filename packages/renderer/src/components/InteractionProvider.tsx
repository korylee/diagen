import { createContext, JSX, useContext } from 'solid-js'
import { CreateKeyboard, createScroll } from '@diagen/primitives'
import type { CreatePointerInteraction } from '../primitives'

type Interaction = {
  pointer: CreatePointerInteraction
  keyboard: CreateKeyboard
  scroll: ReturnType<typeof createScroll>
}

interface InteractionContextProps {
  interaction: Interaction
  children: JSX.Element
}

const InteractionContext = createContext<Interaction>()

export function InteractionProvider(props: InteractionContextProps) {
  return <InteractionContext.Provider value={props.interaction}>{props.children}</InteractionContext.Provider>
}

export function useInteraction() {
  const interaction = useContext(InteractionContext)
  if (!interaction) {
    throw new Error('useInteraction must be used within an InteractionProvider')
  }
  return interaction
}

import { createContext, JSX, useContext } from 'solid-js'
import { CreateKeyboard } from '@diagen/primitives'
import type { CreatePointerInteraction, CoordinateService } from '../primitives'

type Interaction = {
  pointer: CreatePointerInteraction
  coordinate: CoordinateService
  keyboard: CreateKeyboard
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

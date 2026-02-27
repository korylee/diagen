import { createScroll } from '@diagen/primitives'
import { CreateDrag, CreatePan, CreateResize, CreateSelection, CreateKeyboard } from '../primitives'
import { createContext, JSX, useContext } from 'solid-js'

type Interaction = {
  drag: CreateDrag
  resize: CreateResize
  pan: CreatePan
  boxSelect: CreateSelection
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

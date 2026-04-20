import { isLinker, isShape, LinkerElement, ShapeElement } from '@diagen/core'
import { For, Match, Switch } from 'solid-js'
import { useDesigner } from '../context'
import { LinkerCanvas, ShapeCanvas } from './element'

export interface CanvasRendererProps {}

export function CanvasRenderer() {
  const designer = useDesigner()
  const { element } = designer

  return (
    <For each={element.elements()}>
      {item => (
        <Switch>
          <Match when={isShape(item)}>
            <ShapeCanvas shape={item as ShapeElement} />
          </Match>
          <Match when={isLinker(item)}>
            <LinkerCanvas linker={item as LinkerElement} />
          </Match>
        </Switch>
      )}
    </For>
  )
}

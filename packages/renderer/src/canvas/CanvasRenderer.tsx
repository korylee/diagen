import { isLinker, isShape } from '@diagen/core'
import { For } from 'solid-js'
import { useDesigner } from '../components'
import { LinkerCanvas, ShapeCanvas } from './element'

export interface CanvasRendererProps {}

export function CanvasRenderer() {
  const designer = useDesigner()
  const { element } = designer

  return (
    <>
      <For each={element.elements()}>
        {item => {
          if (isShape(item)) {
            return <ShapeCanvas shape={item} />
          }

          if (isLinker(item)) {
            return <LinkerCanvas linker={item} />
          }

          return null
        }}
      </For>
    </>
  )
}

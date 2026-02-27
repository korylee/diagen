import { screenToCanvas } from '@diagen/core'
import { For } from 'solid-js'
import { useDesigner, useInteraction } from '../components'
import { LinkerCanvas, ShapeCanvas } from './element'

export interface CanvasRendererProps {}

export function CanvasRenderer(props: CanvasRendererProps) {
  const designer = useDesigner()
  const { element, selection, view, edit } = designer
  const { drag, resize, scroll } = useInteraction()

  const onMouseDown = (e: MouseEvent, id: string) => {
    e.stopPropagation()

    // 调整大小检测
    const point = screenToCanvas(
      { x: e.clientX - scroll.position.x, y: e.clientY - scroll.position.y },
      view.viewport(),
    )
    const hit = resize.hitTest(point)
    if (hit) {
      resize.start(hit.id, hit.dir, e)
      return
    }

    // 选择逻辑
    if (e.ctrlKey || e.metaKey) {
      selection.isSelected(id) ? selection.deselect(id) : selection.select(id)
    } else {
      selection.replace([id])
    }

    // 开始拖动
    drag.start(e)
  }

  return (
    <>
      <For each={element.shapes()}>
        {element => <ShapeCanvas shape={element} onMouseDown={e => onMouseDown(e, element.id)} />}
      </For>

      <For each={element.linkers()}>
        {element => <LinkerCanvas linker={element} onMouseDown={e => onMouseDown(e, element.id)} />}
      </For>
    </>
  )
}

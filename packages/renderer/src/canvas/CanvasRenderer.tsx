import { isLinker } from '@diagen/core'
import { For } from 'solid-js'
import { useDesigner, useInteraction } from '../components'
import { LinkerCanvas, ShapeCanvas } from './element'

export interface CanvasRendererProps {}

export function CanvasRenderer(props: CanvasRendererProps) {
  const designer = useDesigner()
  const { element, selection } = designer
  const { pointer } = useInteraction()

  const applySelection = (id: string, event: MouseEvent) => {
    if (event.ctrlKey || event.metaKey) {
      selection.isSelected(id) ? selection.deselect(id) : selection.select(id)
    } else {
      selection.replace([id])
    }
  }

  const onShapeMouseDown = (e: MouseEvent, id: string): boolean => {
    e.stopPropagation()
    e.preventDefault()

    // 调整大小检测
    const point = pointer.coordinate.eventToCanvas(e)
    const hit = pointer.resize.hitTest(point)
    if (hit) {
      pointer.machine.startResize(hit.id, hit.dir, e)
      return true
    }

    applySelection(id, e)

    // 开始拖动
    return pointer.machine.startShapeDrag(e)
  }

  const onLinkerMouseDown = (e: MouseEvent, id: string): boolean => {
    const target = element.getById(id)
    if (!target || !isLinker(target)) return false

    const point = pointer.coordinate.eventToCanvas(e)
    const hitResult = pointer.linkerDrag.hitTestWithRoute(id, point)
    const hit = hitResult?.hit
    const linkerHit =
      hit ??
      (selection.isSelected(id) && !e.ctrlKey && !e.metaKey
        ? ({
            type: 'line',
          } as const)
        : null)

    if (!linkerHit) {
      return false
    }

    e.stopPropagation()
    e.preventDefault()
    applySelection(id, e)
    return pointer.machine.startLinkerDrag(e, id, point, linkerHit, hitResult?.route)
  }

  return (
    <>
      <For each={element.shapes()}>
        {element => <ShapeCanvas shape={element} onMouseDown={e => onShapeMouseDown(e, element.id)} />}
      </For>

      <For each={element.linkers()}>
        {element => <LinkerCanvas linker={element} onMouseDown={e => onLinkerMouseDown(e, element.id)} />}
      </For>
    </>
  )
}

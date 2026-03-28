import type { Accessor } from 'solid-js'
import { produce, type SetStoreFunction } from 'solid-js/store'
import { isShape, type DiagramElement, type ShapeElement } from '../../../model'
import type { EditorState } from '../../types'

export type ElementAlignType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type ElementDistributeType = 'horizontal' | 'vertical'

interface CreateElementArrangeActionsOptions {
  setState: SetStoreFunction<EditorState>
  elementMap: Accessor<Record<string, DiagramElement>>
}

export function createElementArrangeActions(options: CreateElementArrangeActionsOptions) {
  function align(ids: string[], type: ElementAlignType): void {
    if (ids.length < 2) return

    const selectedShapes = getSelectedShapes(ids, options.elementMap)
    if (selectedShapes.length < 2) return

    const lefts = selectedShapes.map(shape => shape.props.x)
    const rights = selectedShapes.map(shape => shape.props.x + shape.props.w)
    const tops = selectedShapes.map(shape => shape.props.y)
    const bottoms = selectedShapes.map(shape => shape.props.y + shape.props.h)

    const minX = Math.min(...lefts)
    const maxX = Math.max(...rights)
    const minY = Math.min(...tops)
    const maxY = Math.max(...bottoms)

    options.setState(
      'diagram',
      'elements',
      produce(elements => {
        for (const shape of selectedShapes) {
          const element = elements[shape.id] as ShapeElement
          if (!element) continue

          switch (type) {
            case 'left':
              element.props.x = minX
              break
            case 'right':
              element.props.x = maxX - element.props.w
              break
            case 'center':
              element.props.x = minX + (maxX - minX) / 2 - element.props.w / 2
              break
            case 'top':
              element.props.y = minY
              break
            case 'bottom':
              element.props.y = maxY - element.props.h
              break
            case 'middle':
              element.props.y = minY + (maxY - minY) / 2 - element.props.h / 2
              break
          }
        }
      }),
    )
  }

  function distribute(ids: string[], type: ElementDistributeType): void {
    if (ids.length < 3) return

    const selectedShapes = getSelectedShapes(ids, options.elementMap)
    if (selectedShapes.length < 3) return

    if (type === 'horizontal') {
      const sorted = [...selectedShapes].sort((a, b) => a.props.x - b.props.x)
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const totalWidth = sorted.reduce((sum, shape) => sum + shape.props.w, 0)
      const gap = (last.props.x + last.props.w - first.props.x - totalWidth) / (sorted.length - 1)

      let currentX = first.props.x
      options.setState(
        'diagram',
        'elements',
        produce(elements => {
          for (const shape of sorted) {
            const element = elements[shape.id] as ShapeElement
            if (!element) continue
            element.props.x = currentX
            currentX += element.props.w + gap
          }
        }),
      )
      return
    }

    const sorted = [...selectedShapes].sort((a, b) => a.props.y - b.props.y)
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const totalHeight = sorted.reduce((sum, shape) => sum + shape.props.h, 0)
    const gap = (last.props.y + last.props.h - first.props.y - totalHeight) / (sorted.length - 1)

    let currentY = first.props.y
    options.setState(
      'diagram',
      'elements',
      produce(elements => {
        for (const shape of sorted) {
          const element = elements[shape.id] as ShapeElement
          if (!element) continue
          element.props.y = currentY
          currentY += element.props.h + gap
        }
      }),
    )
  }

  function toFront(ids: string[]): void {
    const idsSet = new Set(ids)
    options.setState('diagram', 'orderList', list => {
      const remaining = list.filter(id => !idsSet.has(id))
      const moving = list.filter(id => idsSet.has(id))
      return [...remaining, ...moving]
    })
  }

  function toBack(ids: string[]): void {
    const idsSet = new Set(ids)
    options.setState('diagram', 'orderList', list => {
      const remaining = list.filter(id => !idsSet.has(id))
      const moving = list.filter(id => idsSet.has(id))
      return [...moving, ...remaining]
    })
  }

  function moveForward(ids: string[]): void {
    const idsSet = new Set(ids)
    options.setState('diagram', 'orderList', list => {
      const nextList = [...list]

      for (let i = nextList.length - 2; i >= 0; i--) {
        if (idsSet.has(nextList[i]) && !idsSet.has(nextList[i + 1])) {
          const temp = nextList[i]
          nextList[i] = nextList[i + 1]
          nextList[i + 1] = temp
        }
      }

      return nextList
    })
  }

  function moveBackward(ids: string[]): void {
    const idsSet = new Set(ids)
    options.setState('diagram', 'orderList', list => {
      const nextList = [...list]

      for (let i = 1; i < nextList.length; i++) {
        if (idsSet.has(nextList[i]) && !idsSet.has(nextList[i - 1])) {
          const temp = nextList[i]
          nextList[i] = nextList[i - 1]
          nextList[i - 1] = temp
        }
      }

      return nextList
    })
  }

  return {
    align,
    distribute,
    toFront,
    toBack,
    moveForward,
    moveBackward,
  }
}

function getSelectedShapes(
  ids: string[],
  elementMap: Accessor<Record<string, DiagramElement>>,
): ShapeElement[] {
  return ids.map(id => elementMap()[id]).filter(isShape) as ShapeElement[]
}

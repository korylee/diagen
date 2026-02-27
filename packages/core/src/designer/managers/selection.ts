import type { DesignerContext } from './types'
import { createMemo } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { getElementBounds } from '../../utils'
import type { Point, Rect } from '@diagen/shared'
import { ensureArray, normalizeRect } from '@diagen/shared'
import { ElementManager } from './element'

export function createSelectionManager(
  ctx: DesignerContext,
  deps: {
    element: ElementManager
  },
) {
  const { emit } = ctx
  const { element } = deps
  const [selected, setSelected] = createStore<Record<string, boolean>>({})

  const isSelected = (id: string): boolean => selected[id]
  const selectedIds = createMemo(() => Object.keys(selected))
  const isEmpty = createMemo(() => selectedIds().length === 0)
  const hasMultiple = createMemo(() => selectedIds().length > 1)

  function replace(ids: string[], anchorPoint?: Point) {
    const previous = selectedIds().slice()
    setSelected(
      produce(selected => {
        for (const id in selected) {
          delete selected[id]
        }
        for (const id of ids) {
          selected[id] = true
        }
      }),
    )
    emit('selection:replaced', {
      previous,
      ids,
    })
  }
  // add to selection
  function select(id: string[] | string, anchorPoint?: Point) {
    const ids = ensureArray(id)
    const previous = selectedIds().slice()
    setSelected(
      produce(selected => {
        let changed = false
        for (const id of ids) {
          if (!selected[id]) {
            selected[id] = true
            changed = true
          }
        }
        changed &&
          emit('selection:selected', {
            previous,
            ids,
          })
      }),
    )
  }

  function deselect(id: string[] | string, anchorPoint?: Point) {
    const ids = ensureArray(id)
    const previous = selectedIds().slice()
    setSelected(
      produce(selected => {
        let changed = false
        for (const id of ids) {
          if (selected[id]) {
            delete selected[id]
            changed = true
          }
        }
        changed &&
          emit('selection:deselect', {
            previous,
            ids,
          })
      }),
    )
  }

  function selectAll() {
    const ids = element.elements().map(elem => elem.id)
    select(ids)
  }

  function clear() {
    if (isEmpty()) return
    replace([])
  }

  const getSelectionBounds = createMemo((): Rect | null => {
    const ids = selectedIds()
    if (ids.length === 0) return null

    let minX = Infinity,
      minY = Infinity
    let maxX = -Infinity,
      maxY = -Infinity

    for (const id of ids) {
      const el = element.getById(id)
      const b = el && getElementBounds(el)
      if (b) {
        const nb = normalizeRect(b) // 添加规范化
        minX = Math.min(minX, nb.x)
        minY = Math.min(minY, nb.y)
        maxX = Math.max(maxX, nb.x + nb.w)
        maxY = Math.max(maxY, nb.y + nb.h)
      }
    }

    if (minX === Infinity) return null

    return normalizeRect({ x: minX, y: minY, w: maxX - minX, h: maxY - minY })
  })

  return {
    selected,
    setSelected,
    selectedIds,
    hasMultiple,
    isEmpty,
    isSelected,

    getSelectionBounds,
    replace,
    select,
    deselect,
    clear,
    selectAll,
  }
}

export type SelectionManager = ReturnType<typeof createSelectionManager>

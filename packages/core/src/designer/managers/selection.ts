import { ensureArray, keys, Point } from '@diagen/shared'
import { createMemo } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import type { ElementManager } from './element'
import type { DesignerContext } from './types'

export interface SelectionEvents {
  'selection:replaced': { previous: string[]; current: string[] }
  'selection:selected': { previous: string[]; current: string[] }
  'selection:deselected': { previous: string[]; current: string[] }
}

export function createSelectionManager(
  ctx: DesignerContext,
  deps: {
    element: ElementManager
  },
) {
  const { emit } = ctx.emitter
  const { element } = deps
  const [selected, setSelected] = createStore<Record<string, boolean>>({})

  const isSelected = (id: string): boolean => selected[id]
  const selectedIds = createMemo(() => keys(selected))
  const selectedCount = createMemo(() => selectedIds().length)
  const isEmpty = createMemo(() =>selectedCount() === 0)
  const hasMultiple = createMemo(() =>selectedCount() > 1)

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
        emit('selection:replaced', {
          previous,
          current: keys(selected),
        })
      }),
    )
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
        if (changed) {
          emit('selection:selected', {
            previous,
            current: keys(selected),
          })
        }
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
        if (changed) {
          emit('selection:deselected', {
            previous,
            current: keys(selected),
          })
        }
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

  return {
    selected,

    setSelected,
    selectedIds,
    selectedCount,
    hasMultiple,
    isEmpty,
    isSelected,

    replace,
    select,
    deselect,
    clear,
    selectAll,
  }
}

export type SelectionManager = ReturnType<typeof createSelectionManager>

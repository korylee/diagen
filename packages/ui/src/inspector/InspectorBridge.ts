import { Schema, isLinker, isShape, type DiagramElement, type LinkerElement, type ShapeElement } from '@diagen/core'
import { useDesigner } from '@diagen/renderer'
import type { Accessor } from 'solid-js'
import { createMemo } from 'solid-js'

function getMixedString(values: readonly (string | undefined)[]): string | undefined {
  const [first, ...rest] = values
  if (first === undefined) return undefined
  return rest.every(value => value === first) ? first : undefined
}

function getMixedNumber(values: readonly number[]): number | undefined {
  const [first, ...rest] = values
  if (first === undefined) return undefined
  return rest.every(value => value === first) ? first : undefined
}

export interface InspectorBridge {
  selectionCount: Accessor<number>
  selectedElements: Accessor<readonly DiagramElement[]>
  selectedShape: Accessor<ShapeElement | undefined>
  selectedLinker: Accessor<LinkerElement | undefined>
  canEditSingleElement: Accessor<boolean>
  hasShapeSelection: Accessor<boolean>
  lineColorValue: Accessor<string | undefined>
  fillColorValue: Accessor<string | undefined>
  fontSizeValue: Accessor<number | undefined>
  lineColorPlaceholder: Accessor<string | undefined>
  fillColorPlaceholder: Accessor<string | undefined>
  fontSizePlaceholder: Accessor<string | undefined>
  applyLineColorAsDefault: () => void
  applyFillColorAsDefault: () => void
  applyFontSizeAsDefault: () => void
  setLineColor: (value: string) => void
  setFillColor: (value: string) => void
  setFontSize: (value: number) => void
}

export function createInspectorBridge(): InspectorBridge {
  const designer = useDesigner()
  const selectionCount = designer.selection.selectedCount
  const selectedElements = createMemo<readonly DiagramElement[]>(() =>
    designer.element.getElementsByIds(designer.selection.selectedIds()),
  )
  const selectedShape = createMemo<ShapeElement | undefined>(() => {
    const [element] = selectedElements()
    return selectionCount() === 1 && isShape(element) ? element : undefined
  })
  const selectedLinker = createMemo<LinkerElement | undefined>(() => {
    const [element] = selectedElements()
    return selectionCount() === 1 && isLinker(element) ? element : undefined
  })
  const editableElements = createMemo<readonly (ShapeElement | LinkerElement)[]>(() =>
    selectedElements().filter((element): element is ShapeElement | LinkerElement => isShape(element) || isLinker(element)),
  )
  const editableShapes = createMemo<readonly ShapeElement[]>(() =>
    selectedElements().filter((element): element is ShapeElement => isShape(element)),
  )
  const canEditSingleElement = createMemo<boolean>(() => selectedShape() !== undefined || selectedLinker() !== undefined)
  const hasShapeSelection = createMemo<boolean>(() => editableShapes().length > 0)

  const lineColorValue = createMemo<string | undefined>(() =>
    getMixedString(editableElements().map(element => element.lineStyle.lineColor)),
  )
  const fillColorValue = createMemo<string | undefined>(() =>
    getMixedString(editableShapes().map(shape => shape.fillStyle.color)),
  )
  const fontSizeValue = createMemo<number | undefined>(() =>
    getMixedNumber(editableElements().map(element => element.fontStyle.size)),
  )

  const lineColorPlaceholder = createMemo<string | undefined>(() =>
    editableElements().length > 1 && lineColorValue() === undefined ? 'Mixed' : '50,50,50',
  )
  const fillColorPlaceholder = createMemo<string | undefined>(() =>
    editableShapes().length > 1 && fillColorValue() === undefined ? 'Mixed' : '255,255,255',
  )
  const fontSizePlaceholder = createMemo<string | undefined>(() =>
    editableElements().length > 1 && fontSizeValue() === undefined ? 'Mixed' : undefined,
  )

  const runBatch = (fn: (id: string) => void) => {
    const ids = designer.selection.selectedIds()
    if (ids.length === 0) return
    const scope = designer.history.createScope('Update inspector styles')
    scope.begin()
    try {
      for (const id of ids) {
        fn(id)
      }
      scope.commit()
    } catch (error) {
      scope.abort()
      throw error
    }
  }

  const applyLineColorAsDefault = () => {
    const value = lineColorValue()
    if (!value) return
    Schema.setDefaultLineStyle({ lineColor: value })
  }

  const applyFillColorAsDefault = () => {
    const value = fillColorValue()
    if (!value) return
    Schema.setDefaultFillStyle({ color: value })
  }

  const applyFontSizeAsDefault = () => {
    const value = fontSizeValue()
    if (value === undefined) return
    Schema.setDefaultFontStyle({ size: value })
  }

  const setLineColor = (value: string) => {
    runBatch(id => {
      designer.edit.update(id, 'lineStyle', 'lineColor', value)
    })
  }

  const setFillColor = (value: string) => {
    const shapes = editableShapes()
    if (shapes.length === 0) return
    const scope = designer.history.createScope('Update inspector fill styles')
    scope.begin()
    try {
      for (const shape of shapes) {
        designer.edit.update(shape.id, 'fillStyle', 'color', value)
      }
      scope.commit()
    } catch (error) {
      scope.abort()
      throw error
    }
  }

  const setFontSize = (value: number) => {
    if (Number.isNaN(value)) return
    runBatch(id => {
      designer.edit.update(id, 'fontStyle', 'size', value)
    })
  }

  return {
    selectionCount,
    selectedElements,
    selectedShape,
    selectedLinker,
    canEditSingleElement,
    hasShapeSelection,
    lineColorValue,
    fillColorValue,
    fontSizeValue,
    lineColorPlaceholder,
    fillColorPlaceholder,
    fontSizePlaceholder,
    applyLineColorAsDefault,
    applyFillColorAsDefault,
    applyFontSizeAsDefault,
    setLineColor,
    setFillColor,
    setFontSize,
  }
}

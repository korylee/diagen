import { createMemo } from 'solid-js'
import { Schema, type Designer } from '@diagen/core'
import type { PanelSectionData } from '@diagen/ui'

import { SidebarCanvasPreview } from './SidebarCanvasPreview'

function resolveActiveItemId(designer: Designer): string | undefined {
  const current = designer.tool.tool()

  if (current.type === 'create-shape') {
    return `tool:shape:${current.shapeId}`
  }

  if (current.type === 'create-linker') {
    return `tool:linker:${current.linkerId}`
  }

  return undefined
}

function createShapePreview(shapeId: string) {
  return <SidebarCanvasPreview shapeId={shapeId} class="sidebar-preview" accent="#8b5e34" />
}

function createLinkerPreview(linkerId: string) {
  return <SidebarCanvasPreview linkerId={linkerId} class="sidebar-preview" accent="#0f766e" />
}

export function createShapeLibraryBridge(designer: Designer) {
  const activeItemId = createMemo<string | undefined>(() => resolveActiveItemId(designer))

  const shapeSections = createMemo<PanelSectionData[]>(() =>
    Schema.getAllCategories().map(category => {
      const shapes = Schema.getShapesByCategory(category.id)

      return {
        id: `category:${category.id}`,
        title: category.name,
        description: '选择图形后进入创建态',
        meta: shapes.length.toString(),
        layout: 'grid',
        items: shapes.map(shape => ({
          id: `tool:shape:${shape.id}`,
          label: shape.title,
          description: shape.name,
          preview: createShapePreview(shape.id),
          meta: category.name,
          keywords: [shape.id, shape.name, shape.title, category.id, category.name],
          onSelect: () => {
            designer.tool.toggleCreateShape(shape.id)
          },
        })),
      }
    }),
  )

  const linkerSection = createMemo<PanelSectionData>(() => ({
    id: 'category:linkers',
    title: '连线',
    description: '选择连线类型后直接在画布发起创建',
    meta: '3',
    layout: 'grid',
    items: Schema.getAllLinkers().map(linker => ({
      id: `tool:linker:${linker.id}`,
      label: linker.title,
      description: linker.name,
      preview: createLinkerPreview(linker.id),
      meta: '连线',
      keywords: [linker.id, linker.name, linker.title, 'line', 'linker', 'connector'],
      onSelect: () => {
        designer.tool.toggleCreateLinker(linker.id)
      },
    })),
  }))

  const sections = createMemo<readonly PanelSectionData[]>(() => [...shapeSections(), linkerSection()])

  return {
    sections,
    activeItemId,
  }
}

export type ShapeLibraryBridge = ReturnType<typeof createShapeLibraryBridge>

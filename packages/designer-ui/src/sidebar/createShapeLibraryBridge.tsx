import { createMemo } from 'solid-js'
import { Schema, type Designer } from '@diagen/core'
import type { SidebarSection } from '@diagen/ui'

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

  const shapeSections = createMemo<SidebarSection[]>(() =>
    Schema.getAllCategories().map(category => {
      const shapes = Schema.getShapesByCategory(category.id)

      return {
        id: `category:${category.id}`,
        title: category.name,
        description: '选择图形后进入创建态',
        meta: shapes.length.toString(),
        layout: 'grid',
        collapsible: true,
        defaultCollapsed: false,
        items: shapes.map(shape => ({
          id: `tool:shape:${shape.id}`,
          label: shape.title,
          description: shape.name,
          preview: createShapePreview(shape.id),
          keywords: [shape.id, shape.name, shape.title, category.id, category.name],
          onSelect: () => {
            designer.tool.toggleCreateShape(shape.id)
          },
        })),
      }
    }),
  )

  const linkerSection = createMemo<SidebarSection>(() => ({
    id: 'category:linkers',
    title: '连线',
    description: '选择连线类型后直接在画布发起创建',
    meta: '3',
    layout: 'grid',
    collapsible: true,
    defaultCollapsed: false,
    items: Schema.getAllLinkers().map(linker => ({
      id: `tool:linker:${linker.id}`,
      label: linker.title,
      description: linker.name,
      preview: createLinkerPreview(linker.id),
      keywords: [linker.id, linker.name, linker.title, 'line', 'linker', 'connector'],
      onSelect: () => {
        designer.tool.toggleCreateLinker(linker.id)
      },
    })),
  }))

  const sections = createMemo<readonly SidebarSection[]>(() => [...shapeSections(), linkerSection()])

  return {
    sections,
    activeItemId,
  }
}

export type ShapeLibraryBridge = ReturnType<typeof createShapeLibraryBridge>

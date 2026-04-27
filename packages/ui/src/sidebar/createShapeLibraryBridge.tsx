import { Schema, type Designer } from '@diagen/core'
import { createMemo, type Accessor } from 'solid-js'

import { access } from '@diagen/primitives'
import { selectLinkerCreationTool, selectShapeCreationTool, type SidebarCreationMode } from './creationMode'
import type { SidebarPreviewData, SidebarSectionData } from './types'

function resolveActiveItemId(designer: Designer): string | undefined {
  const current = designer.tool.toolState()

  if (current.type === 'create-shape') {
    return `tool:shape:${current.shapeId}`
  }

  if (current.type === 'create-linker') {
    return `tool:linker:${current.linkerId}`
  }

  return undefined
}

const SHAPE_PREVIEW_ACCENT = '#8b5e34'
const LINKER_PREVIEW_ACCENT = '#0f766e'

function createPreview(schema: SidebarPreviewData['schema'], schemaId: string, accent: string): SidebarPreviewData {
  return { schema, schemaId, accent }
}

export interface CreateShapeLibraryBridgeOptions {
  creationMode?: Accessor<SidebarCreationMode>
}

export function createShapeLibraryBridge(designer: Designer, options: CreateShapeLibraryBridgeOptions = {}) {
  const { creationMode = 'batch' } = options
  const activeItemId = createMemo<string | undefined>(() => resolveActiveItemId(designer))

  const shapeSections = createMemo<SidebarSectionData[]>(() =>
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
          preview: createPreview('shape', shape.id, SHAPE_PREVIEW_ACCENT),
          meta: category.name,
          keywords: [shape.id, shape.name, shape.title, category.id, category.name],
          onSelect: () => {
            selectShapeCreationTool(designer, shape.id, access(creationMode))
          },
        })),
      }
    }),
  )

  const linkerSection = createMemo<SidebarSectionData>(() => ({
    id: 'category:linkers',
    title: '连线',
    description: '选择连线类型后直接在画布发起创建',
    meta: '3',
    layout: 'grid',
    items: Schema.getAllLinkers().map(linker => ({
      id: `tool:linker:${linker.id}`,
      label: linker.title,
      description: linker.name,
      preview: createPreview('linker', linker.id, LINKER_PREVIEW_ACCENT),
      meta: '连线',
      keywords: [linker.id, linker.name, linker.title, 'line', 'linker', 'connector'],
      onSelect: () => {
        selectLinkerCreationTool(designer, linker.id, access(creationMode))
      },
    })),
  }))

  const sections = createMemo<readonly SidebarSectionData[]>(() => [...shapeSections(), linkerSection()])

  return {
    sections,
    activeItemId,
  }
}

export type ShapeLibraryBridge = ReturnType<typeof createShapeLibraryBridge>

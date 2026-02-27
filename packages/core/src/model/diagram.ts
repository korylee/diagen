/**
 * Diagram Model
 * The root data structure for a complete diagram
 */

import type { ShapeElement } from './shape'
import type { LinkerElement } from './linker'
import type { PageConfig } from './page'
import type { Theme } from './types'

export type DiagramElement = ShapeElement | LinkerElement

/** Comments on the diagram */
export interface DiagramComment {
  id: string
  text: string
  author?: string
  createdAt: number
  x: number
  y: number
  resolved?: boolean
}

/** Complete diagram model */
export interface Diagram {
  id: string
  name: string
  version: string

  // Elements - normalized storage
  elements: Record<string, DiagramElement>

  // Z-order list for rendering
  orderList: string[]

  // Page configuration
  page: PageConfig

  // Theme
  theme?: Theme

  // Metadata
  createdAt: number
  updatedAt: number
  createdBy?: string

  // Comments
  comments?: DiagramComment[]

  // Custom properties
  properties?: Record<string, unknown>
}

/** Create empty diagram */
export function createEmptyDiagram(id: string, options: Partial<Diagram> = {}): Diagram {
  const now = Date.now()

  return {
    id,
    name: 'Untitled Diagram',
    version: '1.0.0',
    elements: {},
    orderList: [],
    page: {
      id: `page_${id}`,
      name: 'Page 1',
      backgroundColor: 'transparent',
      width: 1050,
      height: 1000,
      padding: 20,
      showGrid: true,
      gridSize: 15,
      gridColor: '#e0e0e0',
      gridStyle: 'line',
      orientation: 'portrait',
      lineJumps: false,
    },
    createdAt: now,
    updatedAt: now,
    comments: [],
    ...options,
  }
}

/** Get children of a container shape */
export function getChildrenOfShape(diagram: Diagram, shapeId: string): DiagramElement[] {
  const shape = diagram.elements[shapeId]
  if (!shape || shape.type !== 'shape') return []

  return shape.children.map(id => diagram.elements[id]).filter(Boolean)
}

/** Serialize diagram to JSON */
export function serializeDiagram(diagram: Diagram): string {
  return JSON.stringify(diagram)
}

/** Deserialize diagram from JSON */
export function deserializeDiagram(json: string): Diagram {
  return JSON.parse(json)
}

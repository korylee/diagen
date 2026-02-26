/**
 * Linker (Connection) Element Model
 */

import type { LinkerType } from '../constants'
import type { BaseElement, LineStyle, FontStyle, DataAttribute } from './types'

export interface LinkerEndpoint {
  id: string | null // Connected shape ID
  x: number
  y: number
  anchorIndex?: number
  angle?: number
}

/** Linker element (connection between shapes) */
export interface LinkerElement extends BaseElement {
  type: 'linker'
  text: string
  linkerType: LinkerType

  // Connection endpoints
  from: LinkerEndpoint
  to: LinkerEndpoint

  // Control points for custom routing
  points: Array<{ x: number; y: number }>

  // Routing (calculated)
  routePoints?: Array<{ x: number; y: number }>

  // Style
  lineStyle: LineStyle
  fontStyle: FontStyle

  // Custom data
  dataAttributes: DataAttribute[]
  data: Record<string, unknown>
}

/** Create default linker element */
export function createDefaultLinker(id: string, options: Partial<LinkerElement> = {}): LinkerElement {
  return {
    id,
    name: 'linker',
    type: 'linker',
    text: '',
    zIndex: 0,
    locked: false,
    visible: true,
    group: null,
    parent: null,
    children: [],
    linkerType: 'broken',
    from: {
      id: null,
      x: 0,
      y: 0,
    },
    to: {
      id: null,
      x: 0,
      y: 0,
    },
    points: [],
    lineStyle: {
      lineWidth: 2,
      lineColor: '50,50,50',
      lineStyle: 'solid',
      beginArrowStyle: 'none',
      endArrowStyle: 'solidArrow',
    },
    fontStyle: {
      fontFamily: '微软雅黑, Arial, sans-serif',
      size: 13,
      lineHeight: 1.25,
      color: '50,50,50',
      bold: false,
      italic: false,
      underline: false,
      textAlign: 'center',
      vAlign: 'middle',
      orientation: 'horizontal',
    },
    dataAttributes: [],
    data: {},
    ...options,
  }
}

export function isLinker(element?: BaseElement): element is LinkerElement {
  return element?.type === 'linker'
}

/** Check if linker is connected to shapes on both ends */
export function isLinkerConnected(linker: LinkerElement): boolean {
  return linker.from.id !== null && linker.to.id !== null
}

/** Check if linker has broken connection */
export function isLinkerBroken(linker: LinkerElement): boolean {
  return linker.from.id === null || linker.to.id === null
}

/** Check if linker is locked */
export function isLinkerLocked(linker: LinkerElement): boolean {
  return linker.locked
}

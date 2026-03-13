/**
 * 连线元素模型
 */

import { generateId } from '@diagen/shared'
import type { LinkerType } from '../constants'
import type { BaseElement, LineStyle, FontStyle, DataAttribute } from './types'

export type LinkerEndpointBinding =
  | { type: 'free' }
  | { type: 'fixed'; anchorId: string }
  | { type: 'perimeter'; pathIndex: number; segmentIndex: number; t: number }

/** 连线端点 */
export interface LinkerEndpoint {
  id?: string | null   // 连接的形状 ID
  x: number
  y: number
  binding: LinkerEndpointBinding
  angle?: number
}

/** 连线元素（形状之间的连接） */
export interface LinkerElement extends BaseElement {
  type: 'linker'
  text: string
  linkerType: LinkerType

  /** 连接端点 */
  from: LinkerEndpoint
  to: LinkerEndpoint

  /** 自定义路由控制点 */
  points: Array<{ x: number; y: number }>

  /** 计算后的路由点 */
  routePoints?: Array<{ x: number; y: number }>

  /** 样式 */
  lineStyle: LineStyle
  fontStyle: FontStyle

  /** 自定义数据 */
  dataAttributes: DataAttribute[]
  data: Record<string, unknown>
}

export function createLinker(patch: Partial<LinkerElement>):LinkerElement {
  return {
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
      binding: { type: 'free' },
    },
    to: {
      id: null,
      x: 0,
      y: 0,
      binding: { type: 'free' },
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
    ...patch,
    id: patch.id || generateId('linker'),
    name: patch.name || 'unknown'
  }
}

export function isLinker(element?: BaseElement): element is LinkerElement {
  return element?.type === 'linker'
}

/** 两端是否都已连接 */
export function isLinkerConnected(linker: LinkerElement): boolean {
  return linker.from.id !== null && linker.to.id !== null
}

/** 是否有断开的连接 */
export function isLinkerBroken(linker: LinkerElement): boolean {
  return linker.from.id === null || linker.to.id === null
}

/** 是否为自由连线（两端都未连接） */
export function isLinkerFree(linker: LinkerElement): boolean {
  return linker.from.id === null && linker.to.id === null
}

/** 是否锁定 */
export function isLinkerLocked(linker: LinkerElement): boolean {
  return linker.locked
}

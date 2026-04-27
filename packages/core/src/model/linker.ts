/**
 * 连线元素模型
 */

import { generateId, Point } from '@diagen/shared'
import { DEFAULTS, type LinkerType } from '../constants'
import type { BaseElement, LineStyle, FontStyle, DataAttribute } from './types'

export type EndpointTarget = string

export type LinkerEndpointBinding =
  | { type: 'free' }
  | { type: 'anchor'; anchorId: string }
  | { type: 'edge'; pathIndex: number; segmentIndex: number; t: number }

type EndpointTransform = Point & {
  angle?: number
}

export type BoundLinkerEndpoint = EndpointTransform & {
  target: EndpointTarget
  binding: Exclude<LinkerEndpointBinding, { type: 'free' }>
}

/** 连线标签相对路线中心的正式偏移 */
export interface LinkerTextPosition {
  dx: number
  dy: number
}

/** 连线端点 */
export type LinkerEndpoint = (EndpointTransform & { binding: { type: 'free' } }) | BoundLinkerEndpoint

/** 连线元素（形状之间的连接） */
export interface LinkerElement extends BaseElement {
  type: 'linker'
  text: string
  linkerType: LinkerType

  /** 连接端点 */
  from: LinkerEndpoint
  to: LinkerEndpoint

  /** 自定义路由控制点 */
  points: Array<Point>

  /** 计算后的路由点 */
  routePoints?: Array<Point>

  /** 连线标签位置；未设置时跟随路线中心自动定位 */
  textPosition?: LinkerTextPosition

  /** 样式 */
  lineStyle: LineStyle
  fontStyle: FontStyle

  /** 自定义数据 */
  dataAttributes: DataAttribute[]
  data: Record<string, unknown>
}

export function createLinker(patch: Partial<LinkerElement>): LinkerElement {
  return {
    text: '',
    zIndex: 0,
    locked: false,
    visible: true,
    group: null,
    parent: null,
    children: [],
    linkerType: 'broken',
    from: {
      x: 0,
      y: 0,
      binding: { type: 'free' },
    },
    to: {
      x: 0,
      y: 0,
      binding: { type: 'free' },
    },
    points: [],
    textPosition: undefined,
    // 保持 create 时的独立对象语义，避免实例间共享默认样式引用。
    lineStyle: { ...DEFAULTS.DEFAULT_LINE_STYLE } as LineStyle,
    fontStyle: { ...DEFAULTS.DEFAULT_FONT_STYLE } as FontStyle,
    dataAttributes: [],
    data: {},
    ...patch,
    type: 'linker',
    id: patch.id || generateId('linker'),
    name: patch.name || 'unknown',
  }
}

export function isLinker(element?: BaseElement): element is LinkerElement {
  return element?.type === 'linker'
}

/** 两端是否都已连接 */
export function isLinkerConnected(linker: LinkerElement): boolean {
  return isBoundLinkerEndpoint(linker.from) && isBoundLinkerEndpoint(linker.to)
}

/** 是否有断开的连接 */
export function isLinkerBroken(linker: LinkerElement): boolean {
  return !isBoundLinkerEndpoint(linker.from) || !isBoundLinkerEndpoint(linker.to)
}

/** 是否为自由连线（两端都未连接） */
export function isLinkerFree(linker: LinkerElement): boolean {
  return !isBoundLinkerEndpoint(linker.from) && !isBoundLinkerEndpoint(linker.to)
}

/** 是否锁定 */
export function isLinkerLocked(linker: LinkerElement): boolean {
  return linker.locked
}

export function isBoundLinkerEndpoint(endpoint: LinkerEndpoint): endpoint is BoundLinkerEndpoint {
  return endpoint.binding.type !== 'free'
}

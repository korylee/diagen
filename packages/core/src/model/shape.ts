/**
 * 形状元素模型
 */

import { deepClone, generateId } from '@diagen/shared'
import { DEFAULTS } from '../constants'
import type {
  Anchor,
  BaseElement,
  BoxProps,
  DataAttribute,
  ElementAttribute,
  FillStyle,
  FontStyle,
  LineStyle,
  PathDefinition,
  ShapeStyle,
  TextBlock,
} from './types'

/** 形状元素 */
export interface ShapeElement extends BaseElement {
  type: 'shape'
  title: string
  link?: string // 超链接

  /** 几何属性 */
  props: BoxProps

  /** 样式 */
  shapeStyle: ShapeStyle
  lineStyle: LineStyle
  fillStyle: FillStyle
  fontStyle: FontStyle

  /** 文本内容 */
  textBlock: TextBlock[]

  /** 连接锚点 */
  anchors: Anchor[]

  /** 路径定义 */
  path: PathDefinition[]

  /** 行为属性 */
  attribute: ElementAttribute

  /** 自定义数据 */
  dataAttributes: DataAttribute[]
  data: Record<string, unknown>

  /** 主题 */
  theme?: string
}

export function createShape(patch: Partial<ShapeElement>): ShapeElement {
  // 默认值按实例克隆，避免某个 shape 的运行时修改污染全局默认配置。
  const defaultTextBlock = deepClone(DEFAULTS.shape.textBlock)
  const defaultAnchors = deepClone(DEFAULTS.shape.anchors)
  const defaultPath = deepClone(DEFAULTS.shape.path)

  return {
    type: 'shape',
    title: '',
    zIndex: 0,
    locked: false,
    visible: true,
    group: null,
    parent: null,
    children: [],
    props: {
      x: 0,
      y: 0,
      w: DEFAULTS.shape.width,
      h: DEFAULTS.shape.height,
      angle: 0,
    },
    shapeStyle: {
      alpha: 1,
    },
    lineStyle: {
      lineWidth: DEFAULTS.style.line.lineWidth,
      lineColor: DEFAULTS.style.line.lineColor,
      lineStyle: DEFAULTS.style.line.lineStyle,
    },
    fillStyle: { ...DEFAULTS.style.fill },
    fontStyle: { ...DEFAULTS.style.font },
    textBlock: [defaultTextBlock],
    anchors: defaultAnchors,
    path: defaultPath,
    attribute: { ...DEFAULTS.shape.attribute },
    dataAttributes: [],
    data: {},
    ...patch,
    id: patch.id || generateId('shape'),
    name: patch.name || 'unknown',
  }
}

export function isShape(element?: BaseElement): element is ShapeElement {
  return element?.type === 'shape'
}

/** 是否为容器形状 */
export function isContainerShape(shape: ShapeElement): boolean {
  return shape.attribute.container
}

/** 是否可调整大小 */
export function isResizable(shape: ShapeElement): boolean {
  return shape.attribute.resizable && !shape.locked
}

/** 是否可移动 */
export function isMovable(shape: ShapeElement): boolean {
  return shape.attribute.movable && !shape.locked
}

/** 是否可旋转 */
export function isRotatable(shape: ShapeElement): boolean {
  return shape.attribute.rotatable && !shape.locked
}

/** 是否可连接 */
export function isLinkable(shape: ShapeElement): boolean {
  return shape.attribute.linkable && !shape.locked
}

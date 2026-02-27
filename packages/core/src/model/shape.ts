/**
 * 形状元素模型
 */

import { generateId } from '@diagen/shared'
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
  TextBlock
} from './types'

/** 形状元素 */
export interface ShapeElement extends BaseElement {
  type: 'shape'
  title: string
  link?: string  // 超链接

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
      w: DEFAULTS.DEFAULT_SHAPE_WIDTH,
      h: DEFAULTS.DEFAULT_SHAPE_HEIGHT,
      angle: 0,
    },
    shapeStyle: {
      alpha: 1,
    },
    lineStyle: {
      lineWidth: 2,
      lineColor: '50,50,50',
      lineStyle: 'solid',
    },
    fillStyle: DEFAULTS.DEFAULT_FILL_STYLE,
    fontStyle: DEFAULTS.DEFAULT_FONT_STYLE,
    textBlock: [DEFAULTS.DEFAULT_TEXT_BLOCK],
    anchors: DEFAULTS.DEFAULT_ANCHORS,
    path: DEFAULTS.DEFAULT_PATH,
    attribute: DEFAULTS.DEFAULT_ATTRIBUTE,
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

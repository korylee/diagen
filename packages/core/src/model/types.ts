/**
 * 核心模型类型定义
 */

import { RotatableBounds } from '@diagen/shared'
import type {
  ArrowStyle,
  ElementType,
  FillType,
  GradientType,
  LineStyleType,
  ShapeCategory,
  TextAlign,
  TextOrientation,
  VerticalAlign,
} from '../constants'

// ============================================================================
// 基础类型
// ============================================================================

/** 元素基础属性 */
export interface BaseElement {
  id: string
  name: string
  type: ElementType
  category?: ShapeCategory
  zIndex: number
  locked: boolean
  visible: boolean
  group: string | null // 所属分组 ID
  parent: string | null // 父元素 ID
  children: string[] // 子元素 ID 列表
}

/** 位置和尺寸属性 */
export interface BoxProps extends Required<RotatableBounds> {}

// ============================================================================
// 样式类型
// ============================================================================

/** 形状样式（透明度、阴影等） */
export interface ShapeStyle {
  alpha: number
  shadow?: ShadowStyle
  blur?: number
}

/** 阴影样式 */
export interface ShadowStyle {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

/** 线条样式 */
export interface LineStyle {
  lineWidth: number
  lineColor: string
  lineStyle: LineStyleType
  beginArrowStyle?: ArrowStyle
  endArrowStyle?: ArrowStyle
  lineJumpEnabled?: boolean
}

/** 填充样式 */
export interface FillStyle {
  type: FillType
  color?: string
  beginColor?: string // 渐变起始色
  endColor?: string // 渐变结束色
  gradientType?: GradientType
  angle?: number
  radius?: number
  /** 图片填充 */
  fileId?: string
  imageUrl?: string
  display?: 'fill' | 'fit' | 'stretch' | 'tile'
  imageX?: number
  imageY?: number
  imageW?: number
  imageH?: number
}

/** 字体样式 */
export interface FontStyle {
  fontFamily: string
  size: number
  lineHeight: number
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  textAlign: TextAlign
  vAlign: VerticalAlign
  orientation: TextOrientation
}

/** 文本块（用于多文本元素） */
export interface TextBlock {
  position: RelativeRect
  text: string
  fontStyle?: FontStyle
}

/** 相对矩形（支持表达式） */
export interface RelativeRect {
  x: number | string
  y: number | string
  w: number | string
  h: number | string
}

// ============================================================================
// 元素属性类型
// ============================================================================

/** 元素行为属性 */
export interface ElementAttribute {
  container: boolean // 是否为容器
  visible: boolean
  rotatable: boolean
  linkable: boolean // 是否可连接
  collapsable: boolean
  collapsed: boolean
  markerOffset: number
  resizable: boolean
  movable: boolean
}

/** 默认元素属性 */
export const DEFAULT_ELEMENT_ATTRIBUTE: ElementAttribute = {
  container: false,
  visible: true,
  rotatable: true,
  linkable: true, // 是否可连接
  collapsable: false,
  collapsed: false,
  markerOffset: 5,
  resizable: true,
  movable: true,
} as const

// ============================================================================
// 锚点类型
// ============================================================================

/** 连接锚点 */
export interface Anchor {
  x: number | string
  y: number | string
  id?: string
  direction?: 'top' | 'right' | 'bottom' | 'left'
}

// ============================================================================
// 路径类型
// ============================================================================

/** 路径动作类型 */
export type PathActionType = 'move' | 'line' | 'curve' | 'quadraticCurve' | 'rect' | 'close'

/** 路径动作 */
export interface PathAction {
  action: PathActionType
  x?: number | string
  y?: number | string
  w?: number | string
  h?: number | string
  x1?: number | string // 控制点1
  y1?: number | string
  x2?: number | string // 控制点2
  y2?: number | string
}

/** 路径定义 */
export interface PathDefinition {
  fillStyle?: FillStyle
  lineStyle?: LineStyle
  actions: PathAction[]
}

// ============================================================================
// 数据属性类型
// ============================================================================

/** 自定义数据属性 */
export interface DataAttribute {
  id: string
  name: string
  category: 'default' | 'custom'
  value?: string
  visible?: boolean
}

// ============================================================================
// 主题类型
// ============================================================================

/** 主题定义 */
export interface Theme {
  name: string
  fillStyle?: FillStyle
  lineStyle?: LineStyle
  fontStyle?: FontStyle
  row?: FillStyle[]
  column?: FillStyle[]
}

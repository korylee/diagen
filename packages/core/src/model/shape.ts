/**
 * Shape Element Model
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

/** Shape element */
export interface ShapeElement extends BaseElement {
  type: 'shape'
  title: string
  link?: string // Hyperlink URL

  // Geometry
  props: BoxProps

  // Styles
  shapeStyle: ShapeStyle
  lineStyle: LineStyle
  fillStyle: FillStyle
  fontStyle: FontStyle

  // Content
  textBlock: TextBlock[]

  // Connection
  anchors: Anchor[]

  // Path
  path: PathDefinition[]

  // Attributes
  attribute: ElementAttribute

  // Custom data
  dataAttributes: DataAttribute[]
  data: Record<string, unknown>

  // Theme
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

/** Check if shape is container */
export function isContainerShape(shape: ShapeElement): boolean {
  return shape.attribute.container
}

/** Check if shape can be resized */
export function isResizable(shape: ShapeElement): boolean {
  return shape.attribute.resizable && !shape.locked
}

/** Check if shape can be moved */
export function isMovable(shape: ShapeElement): boolean {
  return shape.attribute.movable && !shape.locked
}

/** Check if shape can be rotated */
export function isRotatable(shape: ShapeElement): boolean {
  return shape.attribute.rotatable && !shape.locked
}

/** Check if shape can have connections */
export function isLinkable(shape: ShapeElement): boolean {
  return shape.attribute.linkable && !shape.locked
}

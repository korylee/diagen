import { ValueOf } from '@diagen/shared'
// Element Types
import {
  DEFAULT_ANCHORS,
  DEFAULT_ATTRIBUTE,
  DEFAULT_FILL_STYLE,
  DEFAULT_FONT_STYLE,
  DEFAULT_LINE_STYLE,
  DEFAULT_TEXT_BLOCK,
  RECTANGLE_PATH,
} from './schema/defaults'

export const ElementType = {
  SHAPE: 'shape',
  LINKER: 'linker',
  TEXT: 'text',
  IMAGE: 'image',
  GRID: 'grid',
} as const
export type ElementType = ValueOf<typeof ElementType>

// Shape Categories (similar to ProcessOn)
export const ShapeCategory = {
  STANDARD: 'standard',
  BASIC: 'basic',
  FLOW: 'flow',
  LANE: 'lane',
  UML: 'uml',
  CUSTOM: 'custom',
} as const
export type ShapeCategory = ValueOf<typeof ShapeCategory>

// Linker Types
export const LinkerType = {
  BROKEN: 'broken',
  STRAIGHT: 'straight',
  CURVED: 'curved',
  ORTHOGONAL: 'orthogonal',
} as const
export type LinkerType = ValueOf<typeof LinkerType>

// Arrow Styles
export const ArrowStyle = {
  NONE: 'none',
  SOLID_ARROW: 'solidArrow',
  DIAMOND: 'diamond',
  CIRCLE: 'circle',
  OPEN_ARROW: 'openArrow',
} as const
export type ArrowStyle = ValueOf<typeof ArrowStyle>

// Line Styles
export const LineStyleType = {
  SOLID: 'solid',
  DASHED: 'dashed',
  DOTTED: 'dotted',
} as const
export type LineStyleType = ValueOf<typeof LineStyleType>

// Fill Types
export const FillType = {
  NONE: 'none',
  SOLID: 'solid',
  GRADIENT: 'gradient',
  IMAGE: 'image',
} as const
export type FillType = ValueOf<typeof FillType>

// Gradient Types
export const GradientType = {
  LINEAR: 'linear',
  RADIAL: 'radial',
} as const
export type GradientType = ValueOf<typeof GradientType>

// Text Alignments
export const TextAlign = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
} as const
export type TextAlign = ValueOf<typeof TextAlign>

export const VerticalAlign = {
  TOP: 'top',
  MIDDLE: 'middle',
  BOTTOM: 'bottom',
} as const
export type VerticalAlign = ValueOf<typeof VerticalAlign>

// Text Orientation
export const TextOrientation = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
} as const
export type TextOrientation = ValueOf<typeof TextOrientation>

// Default Values
export const DEFAULTS = {
  // config
  GRID_SIZE: 15,
  GRID_COLOR: '#e0e0e0',
  DEFAULT_ZOOM: 1,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 5,
  ZOOM_STEP: 0.1,
  SHOW_GRID: true,

  // Page
  PAGE_WIDTH: 1050,
  PAGE_HEIGHT: 1000,
  PAGE_BACKGROUND: 'rgb(255, 255, 255)',
  PAGE_PADDING: 20,
  LINE_JUMPS: false,

  // Shape
  DEFAULT_SHAPE_WIDTH: 120,
  DEFAULT_SHAPE_HEIGHT: 80,
  DEFAULT_ANCHORS: DEFAULT_ANCHORS,
  DEFAULT_PATH: RECTANGLE_PATH,
  DEFAULT_TEXT_BLOCK: DEFAULT_TEXT_BLOCK,
  DEFAULT_ATTRIBUTE: DEFAULT_ATTRIBUTE,
  DEFAULT_LINE_STYLE: DEFAULT_LINE_STYLE,
  DEFAULT_FONT_STYLE: DEFAULT_FONT_STYLE,
  DEFAULT_FILL_STYLE: DEFAULT_FILL_STYLE,

  // Line
  DEFAULT_LINE_WIDTH: DEFAULT_LINE_STYLE.lineWidth,
  DEFAULT_LINE_COLOR: DEFAULT_LINE_STYLE.lineColor,

  // Font
  DEFAULT_FONT_FAMILY: DEFAULT_FONT_STYLE.fontFamily,
  DEFAULT_FONT_SIZE: DEFAULT_FONT_STYLE.size,
  DEFAULT_FONT_COLOR: DEFAULT_FONT_STYLE.color,

  // Selection
  SELECTION_COLOR: '#2196f3',
  SELECTION_BOX_COLOR: '#2196f3',

  // History
  MAX_HISTORY_SIZE: 100,

  // Performance
  DISABLE_LINE_JUMPS_THRESHOLD: 400,
  ENABLE_VIRTUALIZATION_THRESHOLD: 2000,
} as const

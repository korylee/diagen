// Element Types
import {
  DEFAULT_ANCHORS,
  DEFAULT_ATTRIBUTE,
  DEFAULT_FILL_STYLE,
  DEFAULT_FONT_STYLE,
  DEFAULT_TEXT_BLOCK,
  RECTANGLE_PATH,
} from './schema/defaults'

export const ElementType = {
  SHAPE: 'shape',
  LINKER: 'linker',
  GROUP: 'group',
  TEXT: 'text',
  IMAGE: 'image',
  GRID: 'grid',
} as const
export type ElementType = (typeof ElementType)[keyof typeof ElementType]

// Shape Categories (similar to ProcessOn)
export const ShapeCategory = {
  STANDARD: 'standard',
  BASIC: 'basic',
  FLOW: 'flow',
  LANE: 'lane',
  UML: 'uml',
  CUSTOM: 'custom',
} as const
export type ShapeCategory = (typeof ShapeCategory)[keyof typeof ShapeCategory]

// Linker Types
export const LinkerType = {
  BROKEN: 'broken',
  STRAIGHT: 'straight',
  CURVED: 'curved',
  ORTHOGONAL: 'orthogonal',
} as const
export type LinkerType = (typeof LinkerType)[keyof typeof LinkerType]

// Arrow Styles
export const ArrowStyle = {
  NONE: 'none',
  SOLID_ARROW: 'solidArrow',
  DIAMOND: 'diamond',
  CIRCLE: 'circle',
  OPEN_ARROW: 'openArrow',
} as const
export type ArrowStyle = (typeof ArrowStyle)[keyof typeof ArrowStyle]

// Line Styles
export const LineStyleType = {
  SOLID: 'solid',
  DASHED: 'dashed',
  DOTTED: 'dotted',
} as const
export type LineStyleType = (typeof LineStyleType)[keyof typeof LineStyleType]

// Fill Types
export const FillType = {
  NONE: 'none',
  SOLID: 'solid',
  GRADIENT: 'gradient',
  IMAGE: 'image',
} as const
export type FillType = (typeof FillType)[keyof typeof FillType]

// Gradient Types
export const GradientType = {
  LINEAR: 'linear',
  RADIAL: 'radial',
} as const
export type GradientType = (typeof GradientType)[keyof typeof GradientType]

// Text Alignments
export const TextAlign = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
} as const
export type TextAlign = (typeof TextAlign)[keyof typeof TextAlign]

export const VerticalAlign = {
  TOP: 'top',
  MIDDLE: 'middle',
  BOTTOM: 'bottom',
} as const
export type VerticalAlign = (typeof VerticalAlign)[keyof typeof VerticalAlign]

// Text Orientation
export const TextOrientation = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
} as const
export type TextOrientation = (typeof TextOrientation)[keyof typeof TextOrientation]

// Tool Types
export const ToolType = {
  SELECT: 'select',
  PAN: 'pan',
  ZOOM_IN: 'zoomIn',
  ZOOM_OUT: 'zoomOut',
  TEXT: 'text',
  SHAPE: 'shape',
  LINKER: 'linker',
  ERASER: 'eraser',
} as const
export type ToolType = (typeof ToolType)[keyof typeof ToolType]

// Default Values
export const DEFAULTS = {
  // Canvas
  GRID_SIZE: 15,
  GRID_COLOR: '#e0e0e0',
  DEFAULT_ZOOM: 1,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 5,
  ZOOM_STEP: 0.1,

  // Page
  PAGE_WIDTH: 1050,
  PAGE_HEIGHT: 1000,
  PAGE_BACKGROUND: 'transparent',
  PAGE_PADDING: 20,
  SHOW_GRID: true,
  LINE_JUMPS: false,

  // Shape
  DEFAULT_SHAPE_WIDTH: 120,
  DEFAULT_SHAPE_HEIGHT: 80,
  DEFAULT_ANCHORS: DEFAULT_ANCHORS,
  DEFAULT_PATH: RECTANGLE_PATH,
  DEFAULT_TEXT_BLOCK: DEFAULT_TEXT_BLOCK,
  DEFAULT_ATTRIBUTE: DEFAULT_ATTRIBUTE,
  DEFAULT_FONT_STYLE: DEFAULT_FONT_STYLE,
  DEFAULT_FILL_STYLE: DEFAULT_FILL_STYLE,

  // Line
  DEFAULT_LINE_WIDTH: 2,
  DEFAULT_LINE_COLOR: '50,50,50',

  // Font
  DEFAULT_FONT_FAMILY: '微软雅黑, Arial, sans-serif',
  DEFAULT_FONT_SIZE: 13,
  DEFAULT_FONT_COLOR: '50,50,50',

  // Selection
  SELECTION_COLOR: '#2196f3',
  SELECTION_BOX_COLOR: '#2196f3',

  // History
  MAX_HISTORY_SIZE: 100,

  // Performance
  DISABLE_LINE_JUMPS_THRESHOLD: 400,
  ENABLE_VIRTUALIZATION_THRESHOLD: 2000,
} as const

// Resize Directions
export const RESIZE_DIRECTIONS = ['tl', 't', 'tr', 'l', 'r', 'bl', 'b', 'br'] as const
export type ResizeDirection = (typeof RESIZE_DIRECTIONS)[number]

// Event Types for Editor
export const EditorEventType = {
  RENDER_COMPLETE: 'randerComplete',
  INITIALIZED: 'initialized',
  CREATE: 'create',
  CREATED: 'created',
  LINKER_CREATING: 'linkerCreating',
  LINKER_CREATED: 'linkerCreated',
  SELECT_CHANGED: 'selectChanged',
  UNDO_STACK_CHANGED: 'undoStackChanged',
  REDO_STACK_CHANGED: 'redoStackChanged',
  BEFORE_RESIZE: 'beforeResize',
  RESIZING: 'resizing',
  BEFORE_REMOVE: 'beforeRemove',
  REMOVED: 'removed',
  SHAPE_CHANGED: 'shapeChanged',
  CHANGE_LINKERS: 'changeLinkers',
  RESET_BROKEN_LINKER: 'resetBrokenLinker',
  SHAPE_COUNT: 'shapeCount',
  ZOOM_CHANGED: 'zoomChanged',
  PANE_CHANGED: 'paneChanged',
} as const
export type EditorEventType = (typeof EditorEventType)[keyof typeof EditorEventType]

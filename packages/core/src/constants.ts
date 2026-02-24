/**
 * Shared Constants for VectorGraph Editor
 * Contains enums, default values, and configuration
 */

// Element Types
export enum ElementType {
  SHAPE = 'shape',
  LINKER = 'linker',
  GROUP = 'group',
  TEXT = 'text',
  IMAGE = 'image',
  GRID = 'grid'
}

// Shape Categories (similar to ProcessOn)
export enum ShapeCategory {
  STANDARD = 'standard',
  BASIC = 'basic',
  FLOW = 'flow',
  LANE = 'lane',
  UML = 'uml',
  CUSTOM = 'custom'
}

// Linker Types
export enum LinkerType {
  BROKEN = 'broken',     // 折线
  STRAIGHT = 'straight', // 直线
  CURVED = 'curved',     // 曲线
  ORTHOGONAL = 'orthogonal' // 正交
}

// Arrow Styles
export enum ArrowStyle {
  NONE = 'none',
  SOLID_ARROW = 'solidArrow',
  DIAMOND = 'diamond',
  CIRCLE = 'circle',
  OPEN_ARROW = 'openArrow'
}

// Line Styles
export enum LineStyleType {
  SOLID = 'solid',
  DASHED = 'dashed',
  DOTTED = 'dotted'
}

// Fill Types
export enum FillType {
  NONE = 'none',
  SOLID = 'solid',
  GRADIENT = 'gradient',
  IMAGE = 'image'
}

// Gradient Types
export enum GradientType {
  LINEAR = 'linear',
  RADIAL = 'radial'
}

// Text Alignments
export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right'
}

export enum VerticalAlign {
  TOP = 'top',
  MIDDLE = 'middle',
  BOTTOM = 'bottom'
}

// Text Orientation
export enum TextOrientation {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical'
}

// Tool Types
export enum ToolType {
  SELECT = 'select',
  PAN = 'pan',
  ZOOM_IN = 'zoomIn',
  ZOOM_OUT = 'zoomOut',
  TEXT = 'text',
  SHAPE = 'shape',
  LINKER = 'linker',
  ERASER = 'eraser'
}

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
  ENABLE_VIRTUALIZATION_THRESHOLD: 2000
} as const;

// Resize Directions
export const RESIZE_DIRECTIONS = [
  'tl', 't', 'tr',
  'l',  'r',
  'bl', 'b', 'br'
] as const;

export type ResizeDirection = typeof RESIZE_DIRECTIONS[number];

// Anchor Positions (relative to shape bounds)
export const DEFAULT_ANCHORS = [
  { x: 'w/2', y: '0' },      // top center
  { x: 'w/2', y: 'h' },      // bottom center
  { x: '0', y: 'h/2' },     // left center
  { x: 'w', y: 'h/2' },     // right center
] as const;

// Event Types for Editor
export enum EditorEventType {
  RENDER_COMPLETE = 'randerComplete',
  INITIALIZED = 'initialized',
  CREATE = 'create',
  CREATED = 'created',
  LINKER_CREATING = 'linkerCreating',
  LINKER_CREATED = 'linkerCreated',
  SELECT_CHANGED = 'selectChanged',
  UNDO_STACK_CHANGED = 'undoStackChanged',
  REDO_STACK_CHANGED = 'redoStackChanged',
  BEFORE_RESIZE = 'beforeResize',
  RESIZING = 'resizing',
  BEFORE_REMOVE = 'beforeRemove',
  REMOVED = 'removed',
  SHAPE_CHANGED = 'shapeChanged',
  CHANGE_LINKERS = 'changeLinkers',
  RESET_BROKEN_LINKER = 'resetBrokenLinker',
  SHAPE_COUNT = 'shapeCount',
  ZOOM_CHANGED = 'zoomChanged',
  PANE_CHANGED = 'paneChanged'
}

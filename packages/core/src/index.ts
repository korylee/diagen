/**
 * VectorGraph Core - Main Entry Point
 */

// Model exports
export * from './model';

// Store exports
export * from './store';

// History exports
export * from './history';

// Selection exports
export * from './selection';

// Re-export from shared
export {
  // Constants
  ElementType,
  ShapeCategory,
  LinkerType,
  ArrowStyle,
  LineStyleType,
  FillType,
  GradientType,
  TextAlign,
  VerticalAlign,
  TextOrientation,
  ToolType,
  DEFAULTS,
  RESIZE_DIRECTIONS,
  DEFAULT_ANCHORS,
  EditorEventType,

  // Math
  type Point,
  type Size,
  type Rect,
  type Bounds,
  type Line,
  type Circle,
  getDistance,
  isPointInRect,
  getRectCenter,
  normalizeRect,
  unionRect,
  isRectIntersect,
  getRectIntersection,
  isPointNearLine,
  isLineIntersect,
  getLineIntersection,
  isPointInPolygon,
  getAngle,
  rotatePoint,
  scalePoint,

  // Transform
  type Viewport,
  type ScreenTransform,
  screenToCanvas,
  canvasToScreen,
  canvasRectToScreen,
  calculateZoomToFit,
  calculateCenterOffset,
  clampZoom,
  zoomAtPoint,
  panViewport,
  isRectVisible,
  getVisibleCanvasArea,

  // UID
  generateId,
  generateShortId,
  generateUuid,
  resetIdCounter,

  // Object utilities
  deepClone,
  deepMerge,
  isObject,
  pick,
  omit,
  get,
  set,
  shallowEqual
} from '@vectorgraph/shared';

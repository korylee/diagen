import { Point, Rect, Size } from '@diagen/shared'

// ============================================================================
// 坐标系统说明
// ============================================================================
//
// 1. 画布坐标系：元素在图中的实际位置，不受缩放和平移影响
// 2. 屏幕坐标系：元素在渲染容器中的显示位置，受视口变换影响
//
// 坐标转换公式：
//   屏幕坐标 = 画布坐标 * zoom + viewportOffset
//   画布坐标 = (屏幕坐标 - viewportOffset) / zoom
//
// ============================================================================

/**
 * 视口变换参数
 *
 * 描述画布到屏幕的变换：
 * - x, y: 画布原点 (0,0) 在屏幕上的位置
 * - zoom: 缩放级别，1 = 100%
 */
export interface Viewport extends Point {
  zoom: number
}

/** 渲染容器尺寸 */
export interface CanvasSize extends Size {}

// ============================================================================
// 坐标转换函数
// ============================================================================

/**
 * 将屏幕坐标转换为画布坐标
 *
 * @param screenPoint - 屏幕坐标点（相对于渲染容器左上角）
 * @param viewport - 当前视口状态
 * @param canvasOffset - 画布偏移量（默认为 { x: 0, y: 0 }），用于嵌套场景
 * @returns 画布坐标系中的点
 *
 * @example
 * // 用户点击屏幕位置 (250, 230)
 * // 视口状态为 { x: 50, y: 30, zoom: 2 }
 * // 转换结果：画布坐标 = { x: (250 - 50) / 2, y: (230 - 30) / 2 } = { x: 100, y: 100 }
 */
export function screenToCanvas(screenPoint: Point, viewport: Viewport, canvasOffset: Point = { x: 0, y: 0 }): Point {
  return {
    x: (screenPoint.x - canvasOffset.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - canvasOffset.y - viewport.y) / viewport.zoom,
  }
}

/**
 * 将画布坐标转换为屏幕坐标
 *
 * @param canvasPoint - 画布坐标系中的点
 * @param viewport - 当前视口状态
 * @param canvasOffset - 画布偏移量（默认为 { x: 0, y: 0 }），用于嵌套场景
 * @returns 屏幕坐标系中的点（相对于渲染容器左上角）
 *
 * @example
 * // 画布上的点 (100, 100)
 * // 视口状态为 { x: 50, y: 30, zoom: 2 }
 * // 转换结果：屏幕坐标 = { x: 100 * 2 + 50, y: 100 * 2 + 30 } = { x: 250, y: 230 }
 */
export function canvasToScreen(canvasPoint: Point, viewport: Viewport, canvasOffset: Point = { x: 0, y: 0 }): Point {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.x + canvasOffset.x,
    y: canvasPoint.y * viewport.zoom + viewport.y + canvasOffset.y,
  }
}

// ============================================================================
// 矩形转换函数
// ============================================================================

/**
 * 将画布矩形转换为屏幕矩形
 *
 * @param rect - 画布坐标系中的矩形 { x, y, w, h }
 * @param viewport - 当前视口状态
 * @param canvasOffset - 画布偏移量（默认为 { x: 0, y: 0 }）
 * @returns 屏幕坐标系中的矩形
 */
export function canvasRectToScreen(rect: Rect, viewport: Viewport, canvasOffset: Point = { x: 0, y: 0 }): Rect {
  const { zoom, x, y } = viewport
  const { x: ox, y: oy } = canvasOffset
  return {
    x: rect.x * zoom + x + ox,
    y: rect.y * zoom + y + oy,
    w: rect.w * zoom,
    h: rect.h * zoom,
  }
}

// ============================================================================
// 缩放计算函数
// ============================================================================

/** 计算适应内容的缩放级别（不超过 100%） */
export function calculateZoomToFit(contentBounds: Rect, canvasSize: CanvasSize, padding: number = 50): number {
  if (contentBounds.w === 0 || contentBounds.h === 0) return 1
  const availableWidth = canvasSize.width - padding * 2
  const availableHeight = canvasSize.height - padding * 2
  return Math.min(availableWidth / contentBounds.w, availableHeight / contentBounds.h, 1)
}

/** 计算内容居中时的视口偏移 */
export function calculateCenterOffset(contentBounds: Rect, canvasSize: CanvasSize, zoom: number): Point {
  return {
    x: (canvasSize.width - contentBounds.w * zoom) / 2 - contentBounds.x * zoom,
    y: (canvasSize.height - contentBounds.h * zoom) / 2 - contentBounds.y * zoom,
  }
}

// ============================================================================
// 缩放常量与工具函数
// ============================================================================

/** 默认最小缩放级别 */
export const DEFAULT_MIN_ZOOM = 0.1

/** 默认最大缩放级别 */
export const DEFAULT_MAX_ZOOM = 5

/** 限制缩放级别在有效范围内 */
export function clampZoom(zoom: number, min: number = DEFAULT_MIN_ZOOM, max: number = DEFAULT_MAX_ZOOM): number {
  return Math.max(min, Math.min(max, zoom))
}

/** 以指定点为中心进行缩放 */
export function zoomAtPoint(
  currentZoom: number,
  delta: number,
  point: Point,
  viewport: Viewport,
): { zoom: number; offset: Point } {
  const newZoom = clampZoom(currentZoom + delta)
  const scale = newZoom / currentZoom
  return {
    zoom: newZoom,
    offset: {
      x: point.x - (point.x - viewport.x) * scale,
      y: point.y - (point.y - viewport.y) * scale,
    },
  }
}

// ============================================================================
// 可见性判断函数
// ============================================================================

/** 判断矩形是否在视口中可见 */
export function isRectVisible(
  rect: Rect,
  viewport: Viewport,
  canvasSize: CanvasSize,
  canvasOffset: Point = { x: 0, y: 0 },
): boolean {
  const screenRect = canvasRectToScreen(rect, viewport, canvasOffset)
  return !(
    screenRect.x + screenRect.w < 0 ||
    screenRect.y + screenRect.h < 0 ||
    screenRect.x > canvasSize.width ||
    screenRect.y > canvasSize.height
  )
}

/** 获取当前视口可见的画布区域 */
export function getVisibleCanvasArea(
  viewport: Viewport,
  canvasSize: CanvasSize,
  canvasOffset: Point = { x: 0, y: 0 },
): Rect {
  const topLeft = screenToCanvas({ x: 0, y: 0 }, viewport, canvasOffset)
  const bottomRight = screenToCanvas({ x: canvasSize.width, y: canvasSize.height }, viewport, canvasOffset)
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: bottomRight.x - topLeft.x,
    h: bottomRight.y - topLeft.y,
  }
}

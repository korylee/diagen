import { Bounds, clamp, Point, Size } from '@diagen/shared'
import { DEFAULTS } from '../constants.ts'

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
 * 画布变换参数
 *
 * 描述画布到屏幕的变换：
 * - x, y: 画布原点 (0,0) 在屏幕上的位置
 * - zoom: 缩放级别，1 = 100%
 */
export interface Transform extends Point {
  zoom: number
}

// ============================================================================
// 坐标转换函数
// ============================================================================

/**
 * 将屏幕矩形/坐标转换为画布矩形/坐标
 */
export function screenToCanvas<T extends Point | Bounds>(
  val: T,
  transform: Transform,
  originOffset: Point = { x: 0, y: 0 },
): T extends Bounds ? Bounds : Point {
  const { zoom, x, y } = transform
  const { x: ox, y: oy } = originOffset

  const bounds = val as unknown as Bounds
  if (bounds.w != null) {
    return {
      x: (bounds.x - ox - x) / zoom,
      y: (bounds.y - oy - y) / zoom,
      w: bounds.w / zoom,
      h: bounds.h / zoom,
    } as any
  }

  return {
    x: (val.x - ox - x) / zoom,
    y: (val.y - oy - y) / zoom,
  } as any
} 

/**
 * 将画布矩形/坐标转换为屏幕矩形/坐标
 * @returns 屏幕坐标系中的矩形/坐标
 */
export function canvasToScreen<T extends Point | Bounds>(
  val: T,
  transform: Transform,
  originOffset: Point = { x: 0, y: 0 },
): T extends Bounds ? Bounds : Point {
  const { zoom, x, y } = transform
  const { x: ox, y: oy } = originOffset
  const bounds = val as unknown as Bounds

  if (bounds.w != null) {
    return {
      x: bounds.x * zoom + x + ox,
      y: bounds.y * zoom + y + oy,
      w: bounds.w * zoom,
      h: bounds.h * zoom,
    } as any
  }

  return {
    x: val.x * zoom + x + ox,
    y: val.y * zoom + y + oy,
  } as any
}

/** 限制缩放级别在有效范围内 */
export function clampZoom(zoom: number, min: number = DEFAULTS.zoom.min, max: number = DEFAULTS.zoom.max): number {
  return clamp(zoom, min, max)
}

// ============================================================================
// 可见性判断函数
// ============================================================================

/** 判断矩形是否在视口中可见 */
export function isBoundsVisible(
  bounds: Bounds,
  transform: Transform,
  viewportSize: Size,
  originOffset: Point = { x: 0, y: 0 },
): boolean {
  const screenBounds = canvasToScreen(bounds, transform, originOffset)
  return !(
    screenBounds.x + screenBounds.w < 0 ||
    screenBounds.y + screenBounds.h < 0 ||
    screenBounds.x > viewportSize.width ||
    screenBounds.y > viewportSize.height
  )
}

/** 获取当前视口可见的画布区域 */
export function getVisibleCanvasArea(
  transform: Transform,
  viewportSize: Size,
  originOffset: Point = { x: 0, y: 0 },
): Bounds {
  const topLeft = screenToCanvas({ x: 0, y: 0 }, transform, originOffset)
  const bottomRight = screenToCanvas({ x: viewportSize.width, y: viewportSize.height }, transform, originOffset)
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: bottomRight.x - topLeft.x,
    h: bottomRight.y - topLeft.y,
  }
}

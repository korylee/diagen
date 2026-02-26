import type { Point, Rect } from './geometry';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ScreenTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export function screenToCanvas(
  screenPoint: Point,
  viewport: Viewport,
  canvasOffset: Point = { x: 0, y: 0 }
): Point {
  return {
    x: (screenPoint.x - canvasOffset.x - viewport.x) / viewport.zoom,
    y: (screenPoint.y - canvasOffset.y - viewport.y) / viewport.zoom
  };
}

export function canvasToScreen(
  canvasPoint: Point,
  viewport: Viewport,
  canvasOffset: Point = { x: 0, y: 0 }
): Point {
  return {
    x: canvasPoint.x * viewport.zoom + viewport.x + canvasOffset.x,
    y: canvasPoint.y * viewport.zoom + viewport.y + canvasOffset.y
  };
}

export function canvasRectToScreen(rect: Rect, viewport: Viewport, canvasOffset: Point = { x: 0, y: 0 }): Rect {
  const topLeft = canvasToScreen({ x: rect.x, y: rect.y }, viewport, canvasOffset);
  const bottomRight = canvasToScreen({ x: rect.x + rect.w, y: rect.y + rect.h }, viewport, canvasOffset);
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: bottomRight.x - topLeft.x,
    h: bottomRight.y - topLeft.y
  };
}

export function calculateZoomToFit(contentBounds: Rect, viewportSize: Rect, padding: number = 50): number {
  if (contentBounds.w === 0 || contentBounds.h === 0) return 1;
  const availableWidth = viewportSize.w - padding * 2;
  const availableHeight = viewportSize.h - padding * 2;
  return Math.min(availableWidth / contentBounds.w, availableHeight / contentBounds.h, 1);
}

export function calculateCenterOffset(contentBounds: Rect, viewportSize: Rect, zoom: number): Point {
  return {
    x: (viewportSize.w - contentBounds.w * zoom) / 2 - contentBounds.x * zoom,
    y: (viewportSize.h - contentBounds.h * zoom) / 2 - contentBounds.y * zoom
  };
}

export function clampZoom(zoom: number, min: number = 0.1, max: number = 5): number {
  return Math.max(min, Math.min(max, zoom));
}

export function zoomAtPoint(currentZoom: number, delta: number, point: Point, viewport: Viewport): { zoom: number; offset: Point } {
  const newZoom = clampZoom(currentZoom + delta);
  const scale = newZoom / currentZoom;
  return {
    zoom: newZoom,
    offset: {
      x: point.x - (point.x - viewport.x) * scale,
      y: point.y - (point.y - viewport.y) * scale
    }
  };
}

export function panViewport(viewport: Viewport, delta: Point): Viewport {
  return { ...viewport, x: viewport.x + delta.x, y: viewport.y + delta.y };
}

export function isRectVisible(rect: Rect, viewport: Viewport, viewportSize: Rect, canvasOffset: Point = { x: 0, y: 0 }): boolean {
  const screenRect = canvasRectToScreen(rect, viewport, canvasOffset);
  return !(
    screenRect.x + screenRect.w < 0 ||
    screenRect.y + screenRect.h < 0 ||
    screenRect.x > viewportSize.w ||
    screenRect.y > viewportSize.h
  );
}

export function getVisibleCanvasArea(viewport: Viewport, viewportSize: Rect, canvasOffset: Point = { x: 0, y: 0 }): Rect {
  const topLeft = screenToCanvas({ x: 0, y: 0 }, viewport, canvasOffset);
  const bottomRight = screenToCanvas({ x: viewportSize.w, y: viewportSize.h }, viewport, canvasOffset);
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: bottomRight.x - topLeft.x,
    h: bottomRight.y - topLeft.y
  };
}

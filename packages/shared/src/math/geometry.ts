export interface Point {
  x: number;
  y: number;
}

export interface Size {
  w: number;
  h: number;
}

export interface Rect extends Point, Size {}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getDistanceSquared(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return dx * dx + dy * dy;
}

export function isPointInRect(point: Point, rect: Rect): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}

export function isPointInRotatedRect(point: Point, rect: Rect, angle: number): boolean {
  if (angle === 0) return isPointInRect(point, rect);
  
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const px = point.x - cx;
  const py = point.y - cy;
  
  const rad = (-angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rx = px * cos - py * sin;
  const ry = px * sin + py * cos;
  
  return rx >= -rect.w / 2 && rx <= rect.w / 2 && ry >= -rect.h / 2 && ry <= rect.h / 2;
}

export function getRectCenter(rect: Rect): Point {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

export function normalizeRect(rect: Rect): Rect {
  let { x, y, w, h } = rect;
  if (w < 0) { x += w; w = -w; }
  if (h < 0) { y += h; h = -h; }
  return { x, y, w, h };
}

export function unionRect(rect1: Rect, rect2: Rect): Rect {
  const x = Math.min(rect1.x, rect2.x);
  const y = Math.min(rect1.y, rect2.y);
  return {
    x, y,
    w: Math.max(rect1.x + rect1.w, rect2.x + rect2.w) - x,
    h: Math.max(rect1.y + rect1.h, rect2.y + rect2.h) - y
  };
}

export function isRectIntersect(rect1: Rect, rect2: Rect): boolean {
  return !(
    rect1.x + rect1.w < rect2.x ||
    rect2.x + rect2.w < rect1.x ||
    rect1.y + rect1.h < rect2.y ||
    rect2.y + rect2.h < rect1.y
  );
}

export function getRectIntersection(rect1: Rect, rect2: Rect): Rect | null {
  const x = Math.max(rect1.x, rect2.x);
  const y = Math.max(rect1.y, rect2.y);
  const right = Math.min(rect1.x + rect1.w, rect2.x + rect2.w);
  const bottom = Math.min(rect1.y + rect1.h, rect2.y + rect2.h);
  
  if (right > x && bottom > y) {
    return { x, y, w: right - x, h: bottom - y };
  }
  return null;
}

export function isPointNearLine(point: Point, line: Line, threshold: number = 5): boolean {
  const { x1, y1, x2, y2 } = line;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const px = point.x - x1;
  const py = point.y - y1;
  const lineLengthSquared = dx * dx + dy * dy;
  
  if (lineLengthSquared === 0) return getDistance(point, { x: x1, y: y1 }) <= threshold;
  
  let t = (px * dx + py * dy) / lineLengthSquared;
  t = Math.max(0, Math.min(1, t));
  
  return getDistance(point, { x: x1 + t * dx, y: y1 + t * dy }) <= threshold;
}

export function getAngle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

export function scalePoint(point: Point, center: Point, scale: number): Point {
  return {
    x: center.x + (point.x - center.x) * scale,
    y: center.y + (point.y - center.y) * scale
  };
}

export function boundsToRect(bounds: Bounds): Rect {
  return { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height };
}

export function rectToBounds(rect: Rect): Bounds {
  return { x: rect.x, y: rect.y, width: rect.w, height: rect.h };
}

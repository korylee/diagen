import type { LinkerElement, ShapeElement } from '@diagen/core';
import type { Point, Rect } from '@diagen/shared';
import { resolveAnchors, evaluateExpression, applyLineStyle, applyFontStyle, drawArrow, parseColor } from './render-utils';

export interface LinkerRoute {
  points: Point[];
  fromAngle: number;
  toAngle: number;
}

export function getShapeAnchorPosition(shape: ShapeElement, anchorIndex: number): Point | null {
  if (!shape.anchors || anchorIndex >= shape.anchors.length) return null;
  const anchor = shape.anchors[anchorIndex];
  const ax = evaluateExpression(anchor.x, shape.props.w, shape.props.h);
  const ay = evaluateExpression(anchor.y, shape.props.w, shape.props.h);
  return { x: shape.props.x + ax, y: shape.props.y + ay };
}

export function getAnchorAngle(anchor: Point, w: number, h: number): number {
  const cx = w / 2, cy = h / 2;
  return Math.atan2(anchor.y - cy, anchor.x - cx);
}

export function calculateLinkerRoute(
  linker: LinkerElement,
  getShapeById: (id: string) => ShapeElement | undefined
): LinkerRoute {
  const { from, to, linkerType, points: controlPoints } = linker;
  
  let fromPoint: Point = { x: from.x, y: from.y };
  let toPoint: Point = { x: to.x, y: to.y };
  let fromAngle = from.angle ?? 0;
  let toAngle = to.angle ?? 0;
  
  if (from.id) {
    const shape = getShapeById(from.id);
    if (shape && from.anchorIndex !== undefined) {
      const anchors = resolveAnchors(shape.anchors, shape.props.w, shape.props.h);
      if (anchors[from.anchorIndex]) {
        fromPoint = { x: shape.props.x + anchors[from.anchorIndex].x, y: shape.props.y + anchors[from.anchorIndex].y };
        fromAngle = getAnchorAngle(anchors[from.anchorIndex], shape.props.w, shape.props.h);
      }
    }
  }
  
  if (to.id) {
    const shape = getShapeById(to.id);
    if (shape && to.anchorIndex !== undefined) {
      const anchors = resolveAnchors(shape.anchors, shape.props.w, shape.props.h);
      if (anchors[to.anchorIndex]) {
        toPoint = { x: shape.props.x + anchors[to.anchorIndex].x, y: shape.props.y + anchors[to.anchorIndex].y };
        toAngle = getAnchorAngle(anchors[to.anchorIndex], shape.props.w, shape.props.h);
      }
    }
  }
  
  const routePoints = calculateRoutePoints(fromPoint, toPoint, fromAngle, toAngle, linkerType, controlPoints);
  return { points: routePoints, fromAngle, toAngle };
}

function calculateRoutePoints(
  from: Point, to: Point,
  fromAngle: number, toAngle: number,
  linkerType: string,
  controlPoints: Point[]
): Point[] {
  const points: Point[] = [from];
  
  if (controlPoints.length > 0) {
    points.push(...controlPoints, to);
    return points;
  }
  
  switch (linkerType) {
    case 'straight':
      points.push(to);
      break;
    case 'curved': {
      const dist = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
      const offset = Math.min(dist / 3, 50);
      points.push(
        { x: from.x + Math.cos(fromAngle) * offset, y: from.y + Math.sin(fromAngle) * offset },
        { x: to.x - Math.cos(toAngle) * offset, y: to.y - Math.sin(toAngle) * offset },
        to
      );
      break;
    }
    case 'broken':
    case 'orthogonal': {
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const dx = Math.abs(to.x - from.x);
      const dy = Math.abs(to.y - from.y);
      
      if (dx > dy) {
        points.push({ x: midX, y: from.y }, { x: midX, y: to.y });
      } else {
        points.push({ x: from.x, y: midY }, { x: to.x, y: midY });
      }
      points.push(to);
      break;
    }
    default:
      points.push(to);
  }
  
  return points;
}

export function renderLinker(
  ctx: CanvasRenderingContext2D,
  linker: LinkerElement,
  route: LinkerRoute
): void {
  const { points, fromAngle, toAngle } = route;
  const { lineStyle, text, fontStyle, linkerType } = linker;
  
  if (points.length < 2) return;
  
  ctx.save();
  applyLineStyle(ctx, lineStyle);
  
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  
  if (linkerType === 'curved' && points.length === 4) {
    ctx.bezierCurveTo(points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y);
  } else {
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.stroke();
  
  if (lineStyle.beginArrowStyle && lineStyle.beginArrowStyle !== 'none') {
    const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x);
    drawArrow(ctx, points[0].x, points[0].y, angle + Math.PI, lineStyle.lineWidth * 5, lineStyle.beginArrowStyle, lineStyle.lineColor);
  }
  
  if (lineStyle.endArrowStyle && lineStyle.endArrowStyle !== 'none') {
    const lastIdx = points.length - 1;
    const angle = Math.atan2(points[lastIdx].y - points[lastIdx - 1].y, points[lastIdx].x - points[lastIdx - 1].x);
    drawArrow(ctx, points[lastIdx].x, points[lastIdx].y, angle, lineStyle.lineWidth * 5, lineStyle.endArrowStyle, lineStyle.lineColor);
  }
  
  if (text) {
    const midIdx = Math.floor(points.length / 2);
    const midPoint = points[midIdx];
    applyFontStyle(ctx, fontStyle);
    const metrics = ctx.measureText(text);
    ctx.fillStyle = 'white';
    ctx.fillRect(midPoint.x - metrics.width / 2 - 2, midPoint.y - (fontStyle?.size || 13) / 2 - 2, metrics.width + 4, (fontStyle?.size || 13) + 4);
    ctx.fillStyle = parseColor(fontStyle?.color);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, midPoint.x, midPoint.y);
  }
  
  ctx.restore();
}

export function getLinkerBounds(route: LinkerRoute): Rect {
  const points = route.points;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { x: minX, y: minY, w: maxX - minX || 1, h: maxY - minY || 1 };
}

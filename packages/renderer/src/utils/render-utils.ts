import { Schema, type ShapeElement, type LineStyle, type FillStyle, type FontStyle, type PathDefinition } from '@diagen/core';
import type { Point } from '@diagen/shared';
import { evaluateExpression, compileExpression, evaluateCompiled, type CompiledExpression } from '@diagen/core';

export function parseColor(color: string | undefined): string {
  if (!color) return 'rgba(0,0,0,1)';
  if (color.startsWith('#') || color.startsWith('rgb')) return color;
  const parts = color.split(',');
  if (parts.length >= 3) return `rgb(${parts[0]},${parts[1]},${parts[2]})`;
  return color;
}

export { evaluateExpression };

export function resolveValue(value: number | string | undefined, w: number, h: number): number {
  if (value === undefined) return 0;
  return evaluateExpression(value, w, h, 0);
}

export function resolvePoint(x: number | string, y: number | string, w: number, h: number): Point {
  return { x: resolveValue(x, w, h), y: resolveValue(y, w, h) };
}

export interface ResolvedPathAction {
  action: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface CompiledPathAction {
  action: string;
  x?: CompiledExpression | number;
  y?: CompiledExpression | number;
  w?: CompiledExpression | number;
  h?: CompiledExpression | number;
  x1?: CompiledExpression | number;
  y1?: CompiledExpression | number;
  x2?: CompiledExpression | number;
  y2?: CompiledExpression | number;
}

export function compilePathActions(actions: PathDefinition['actions']): CompiledPathAction[] {
  return actions.map(action => {
    const compiled: CompiledPathAction = { action: action.action };
    if ('x' in action && action.x !== undefined) {
      compiled.x = typeof action.x === 'number' ? action.x : compileExpression(action.x) ?? 0;
    }
    if ('y' in action && action.y !== undefined) {
      compiled.y = typeof action.y === 'number' ? action.y : compileExpression(action.y) ?? 0;
    }
    if ('w' in action && action.w !== undefined) {
      compiled.w = typeof action.w === 'number' ? action.w : compileExpression(action.w) ?? 0;
    }
    if ('h' in action && action.h !== undefined) {
      compiled.h = typeof action.h === 'number' ? action.h : compileExpression(action.h) ?? 0;
    }
    if ('x1' in action && action.x1 !== undefined) {
      compiled.x1 = typeof action.x1 === 'number' ? action.x1 : compileExpression(action.x1) ?? 0;
    }
    if ('y1' in action && action.y1 !== undefined) {
      compiled.y1 = typeof action.y1 === 'number' ? action.y1 : compileExpression(action.y1) ?? 0;
    }
    if ('x2' in action && action.x2 !== undefined) {
      compiled.x2 = typeof action.x2 === 'number' ? action.x2 : compileExpression(action.x2) ?? 0;
    }
    if ('y2' in action && action.y2 !== undefined) {
      compiled.y2 = typeof action.y2 === 'number' ? action.y2 : compileExpression(action.y2) ?? 0;
    }
    return compiled;
  });
}

export function evaluateCompiledPathAction(action: CompiledPathAction, w: number, h: number): ResolvedPathAction {
  const resolved: ResolvedPathAction = { action: action.action };
  if (action.x !== undefined) resolved.x = typeof action.x === 'number' ? action.x : evaluateCompiled(action.x, w, h, 0);
  if (action.y !== undefined) resolved.y = typeof action.y === 'number' ? action.y : evaluateCompiled(action.y, w, h, 0);
  if (action.w !== undefined) resolved.w = typeof action.w === 'number' ? action.w : evaluateCompiled(action.w, w, h, 0);
  if (action.h !== undefined) resolved.h = typeof action.h === 'number' ? action.h : evaluateCompiled(action.h, w, h, 0);
  if (action.x1 !== undefined) resolved.x1 = typeof action.x1 === 'number' ? action.x1 : evaluateCompiled(action.x1, w, h, 0);
  if (action.y1 !== undefined) resolved.y1 = typeof action.y1 === 'number' ? action.y1 : evaluateCompiled(action.y1, w, h, 0);
  if (action.x2 !== undefined) resolved.x2 = typeof action.x2 === 'number' ? action.x2 : evaluateCompiled(action.x2, w, h, 0);
  if (action.y2 !== undefined) resolved.y2 = typeof action.y2 === 'number' ? action.y2 : evaluateCompiled(action.y2, w, h, 0);
  return resolved;
}

export function resolvePathActions(
  actions: PathDefinition['actions'] | { ref: string },
  w: number,
  h: number
): ResolvedPathAction[] {
  if (actions && !Array.isArray(actions) && 'ref' in (actions as any)) {
    const globalActions = (Schema as any).getGlobalCommand((actions as any).ref);
    if (globalActions) {
      return resolvePathActions(globalActions as any, w, h);
    }
    return [];
  }

  const actionArray = Array.isArray(actions) ? actions : [actions];

  return (actionArray as any[]).map(action => {
    const resolved: ResolvedPathAction = { action: action.action };
    if (action.x !== undefined) resolved.x = resolveValue(action.x, w, h);
    if (action.y !== undefined) resolved.y = resolveValue(action.y, w, h);
    if (action.w !== undefined) resolved.w = resolveValue(action.w, w, h);
    if (action.h !== undefined) resolved.h = resolveValue(action.h, w, h);
    if (action.x1 !== undefined) resolved.x1 = resolveValue(action.x1, w, h);
    if (action.y1 !== undefined) resolved.y1 = resolveValue(action.y1, w, h);
    if (action.x2 !== undefined) resolved.x2 = resolveValue(action.x2, w, h);
    if (action.y2 !== undefined) resolved.y2 = resolveValue(action.y2, w, h);
    return resolved;
  });
}

export function resolveAnchors(
  anchors: Array<{ x: number | string; y: number | string }>,
  w: number,
  h: number
): Point[] {
  return anchors.map(a => resolvePoint(a.x, a.y, w, h));
}

export function applyFillStyle(
  ctx: CanvasRenderingContext2D,
  fillStyle: FillStyle | undefined,
  w: number,
  h: number
): void {
  if (!fillStyle || fillStyle.type === 'none') return;
  
  if (fillStyle.type === 'solid' && fillStyle.color) {
    ctx.fillStyle = parseColor(fillStyle.color);
    return;
  }
  
  if (fillStyle.type === 'gradient' && fillStyle.beginColor && fillStyle.endColor) {
    let gradient: CanvasGradient;
    if (fillStyle.gradientType === 'radial') {
      const radius = (fillStyle.radius || 0.75) * Math.min(w, h);
      gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radius);
    } else {
      const angle = (fillStyle.angle || 0) * Math.PI / 180;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const len = Math.max(w, h);
      gradient = ctx.createLinearGradient(
        w / 2 - cos * len / 2, h / 2 - sin * len / 2,
        w / 2 + cos * len / 2, h / 2 + sin * len / 2
      );
    }
    gradient.addColorStop(0, parseColor(fillStyle.beginColor));
    gradient.addColorStop(1, parseColor(fillStyle.endColor));
    ctx.fillStyle = gradient;
  }
}

export function applyLineStyle(ctx: CanvasRenderingContext2D, lineStyle: LineStyle | undefined): void {
  if (!lineStyle) return;
  ctx.lineWidth = lineStyle.lineWidth || 2;
  ctx.strokeStyle = parseColor(lineStyle.lineColor);
  switch (lineStyle.lineStyle) {
    case 'dashed': ctx.setLineDash([8, 4]); break;
    case 'dotted': ctx.setLineDash([2, 4]); break;
    default: ctx.setLineDash([]);
  }
}

export function applyFontStyle(ctx: CanvasRenderingContext2D, fontStyle: FontStyle | undefined): void {
  if (!fontStyle) return;
  const style = fontStyle.italic ? 'italic ' : '';
  const weight = fontStyle.bold ? 'bold ' : '';
  const size = fontStyle.size || 13;
  const family = fontStyle.fontFamily || 'Arial, sans-serif';
  ctx.font = `${style}${weight}${size}px ${family}`;
  ctx.fillStyle = parseColor(fontStyle.color);
  ctx.textAlign = fontStyle.textAlign || 'center';
  ctx.textBaseline = fontStyle.vAlign === 'top' ? 'top' : fontStyle.vAlign === 'bottom' ? 'bottom' : 'middle';
}

export function drawPath(ctx: CanvasRenderingContext2D, actions: ResolvedPathAction[]): void {
  ctx.beginPath();
  for (const a of actions) {
    switch (a.action) {
      case 'move': ctx.moveTo(a.x ?? 0, a.y ?? 0); break;
      case 'line': ctx.lineTo(a.x ?? 0, a.y ?? 0); break;
      case 'curve': ctx.bezierCurveTo(a.x1 ?? 0, a.y1 ?? 0, a.x2 ?? 0, a.y2 ?? 0, a.x ?? 0, a.y ?? 0); break;
      case 'quadraticCurve': ctx.quadraticCurveTo(a.x1 ?? 0, a.y1 ?? 0, a.x ?? 0, a.y ?? 0); break;
      case 'rect': ctx.rect(a.x ?? 0, a.y ?? 0, a.w ?? 0, a.h ?? 0); break;
      case 'close': ctx.closePath(); break;
    }
  }
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number, w: number, h: number,
  fontStyle: FontStyle | undefined
): void {
  if (!text) return;
  applyFontStyle(ctx, fontStyle);
  
  const lines = text.split('\n');
  const lineHeight = (fontStyle?.size || 13) * (fontStyle?.lineHeight || 1.25);
  const totalHeight = lines.length * lineHeight;
  
  let startY = y;
  if (fontStyle?.vAlign === 'middle') startY = y + (h - totalHeight) / 2;
  else if (fontStyle?.vAlign === 'bottom') startY = y + h - totalHeight;
  
  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * lineHeight + (fontStyle?.size || 13) * 0.8;
    ctx.fillText(lines[i], x + w / 2, lineY);
  }
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number,
  size: number, style: string, color: string
): void {
  if (style === 'none') return;
  
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = parseColor(color);
  ctx.strokeStyle = parseColor(color);
  ctx.lineWidth = 2;
  
  switch (style) {
    case 'solidArrow':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size / 2);
      ctx.lineTo(-size, size / 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'openArrow':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, -size / 2);
      ctx.moveTo(0, 0);
      ctx.lineTo(-size, size / 2);
      ctx.stroke();
      break;
    case 'diamond':
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size / 2, -size / 2);
      ctx.lineTo(-size, 0);
      ctx.lineTo(-size / 2, size / 2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(-size / 2, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }
  ctx.restore();
}

export function renderShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeElement
): void {
  const { props, path, fillStyle, lineStyle, shapeStyle, textBlock, fontStyle } = shape;
  const { w, h, angle } = props;
  
  ctx.save();
  ctx.globalAlpha = shapeStyle?.alpha ?? 1;
  ctx.lineJoin = 'round';
  
  if (angle) {
    ctx.translate(w / 2, h / 2);
    ctx.rotate(angle * Math.PI / 180);
    ctx.translate(-w / 2, -h / 2);
  }
  
  for (const pathDef of path) {
    const actions = resolvePathActions(pathDef.actions, w, h);
    drawPath(ctx, actions);
    
    const pf = pathDef.fillStyle || fillStyle;
    const pl = pathDef.lineStyle || lineStyle;
    
    if (pf && pf.type !== 'none') {
      applyFillStyle(ctx, pf, w, h);
      ctx.fill();
    }
    if (pl && pl.lineWidth > 0) {
      applyLineStyle(ctx, pl);
      ctx.stroke();
    }
  }
  
  for (const block of textBlock) {
    const pos = block.position;
    const bx = resolveValue(pos.x, w, h);
    const by = resolveValue(pos.y, w, h);
    const bw = resolveValue(pos.w, w, h);
    const bh = resolveValue(pos.h, w, h);
    drawText(ctx, block.text, bx, by, bw, bh, block.fontStyle || fontStyle);
  }
  
  ctx.restore();
}

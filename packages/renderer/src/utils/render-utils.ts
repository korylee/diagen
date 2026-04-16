import {
  type FillStyle,
  type FontStyle,
  type LineStyle,
  type LinkerElement,
  type LinkerRoute,
  type ShapeElement,
} from '@diagen/core'
import { resolveActions, type ResolvedAction, resolveValue } from '@diagen/core/path'
import { getLinkerTextBox } from '@diagen/core/text'

export function parseColor(color: string | undefined, fallback = 'rgba(0,0,0,1)'): string {
  if (!color) return fallback
  if (color.startsWith('#') || color.startsWith('rgb')) return color
  const parts = color.split(',')
  if (parts.length >= 3) return `rgb(${parts[0]},${parts[1]},${parts[2]})`
  return color
}

export function applyFillStyle(
  ctx: CanvasRenderingContext2D,
  fillStyle: FillStyle | undefined,
  w: number,
  h: number,
): void {
  if (!fillStyle || fillStyle.type === 'none') return

  if (fillStyle.type === 'solid' && fillStyle.color) {
    ctx.fillStyle = parseColor(fillStyle.color)
    return
  }

  if (fillStyle.type === 'gradient' && fillStyle.beginColor && fillStyle.endColor) {
    let gradient: CanvasGradient
    if (fillStyle.gradientType === 'radial') {
      const radius = (fillStyle.radius || 0.75) * Math.min(w, h)
      gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radius)
    } else {
      const angle = ((fillStyle.angle || 0) * Math.PI) / 180
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const len = Math.max(w, h)
      gradient = ctx.createLinearGradient(
        w / 2 - (cos * len) / 2,
        h / 2 - (sin * len) / 2,
        w / 2 + (cos * len) / 2,
        h / 2 + (sin * len) / 2,
      )
    }
    gradient.addColorStop(0, parseColor(fillStyle.beginColor))
    gradient.addColorStop(1, parseColor(fillStyle.endColor))
    ctx.fillStyle = gradient
  }
}

export function applyLineStyle(ctx: CanvasRenderingContext2D, lineStyle: LineStyle | undefined): void {
  if (!lineStyle) return
  ctx.lineWidth = lineStyle.lineWidth || 2
  ctx.strokeStyle = parseColor(lineStyle.lineColor)
  switch (lineStyle.lineStyle) {
    case 'dashed':
      ctx.setLineDash([8, 4])
      break
    case 'dotted':
      ctx.setLineDash([2, 4])
      break
    default:
      ctx.setLineDash([])
  }
}

export function applyFontStyle(ctx: CanvasRenderingContext2D, fontStyle: FontStyle | undefined): void {
  if (!fontStyle) return
  const style = fontStyle.italic ? 'italic ' : ''
  const weight = fontStyle.bold ? 'bold ' : ''
  const size = fontStyle.size || 13
  const family = fontStyle.fontFamily || 'Arial, sans-serif'
  ctx.font = `${style}${weight}${size}px ${family}`
  ctx.fillStyle = parseColor(fontStyle.color)
  ctx.textAlign = fontStyle.textAlign || 'center'
  ctx.textBaseline = fontStyle.vAlign === 'top' ? 'top' : fontStyle.vAlign === 'bottom' ? 'bottom' : 'middle'
}

export function drawPath(ctx: CanvasRenderingContext2D, actions: ResolvedAction[]): void {
  ctx.beginPath()
  for (const a of actions) {
    switch (a.action) {
      case 'move':
        ctx.moveTo(a.x ?? 0, a.y ?? 0)
        break
      case 'line':
        ctx.lineTo(a.x ?? 0, a.y ?? 0)
        break
      case 'curve':
        ctx.bezierCurveTo(a.x1 ?? 0, a.y1 ?? 0, a.x2 ?? 0, a.y2 ?? 0, a.x ?? 0, a.y ?? 0)
        break
      case 'quadraticCurve':
        ctx.quadraticCurveTo(a.x1 ?? 0, a.y1 ?? 0, a.x ?? 0, a.y ?? 0)
        break
      case 'rect':
        ctx.rect(a.x ?? 0, a.y ?? 0, a.w ?? 0, a.h ?? 0)
        break
      case 'close':
        ctx.closePath()
        break
    }
  }
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  fontStyle: FontStyle | undefined,
): void {
  if (!text) return
  applyFontStyle(ctx, fontStyle)

  const lines = text.split('\n')
  const lineHeight = (fontStyle?.size || 13) * (fontStyle?.lineHeight || 1.25)
  const totalHeight = lines.length * lineHeight

  let startY = y
  if (fontStyle?.vAlign === 'middle') startY = y + (h - totalHeight) / 2
  else if (fontStyle?.vAlign === 'bottom') startY = y + h - totalHeight

  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * lineHeight + (fontStyle?.size || 13) * 0.8
    ctx.fillText(lines[i], x + w / 2, lineY)
  }
}

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  style: string,
  color: string,
): void {
  if (style === 'none') return

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = parseColor(color)
  ctx.strokeStyle = parseColor(color)
  ctx.lineWidth = 2

  switch (style) {
    case 'solidArrow':
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-size, -size / 2)
      ctx.lineTo(-size, size / 2)
      ctx.closePath()
      ctx.fill()
      break
    case 'openArrow':
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-size, -size / 2)
      ctx.moveTo(0, 0)
      ctx.lineTo(-size, size / 2)
      ctx.stroke()
      break
    case 'diamond':
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(-size / 2, -size / 2)
      ctx.lineTo(-size, 0)
      ctx.lineTo(-size / 2, size / 2)
      ctx.closePath()
      ctx.fill()
      break
    case 'circle':
      ctx.beginPath()
      ctx.arc(-size / 2, 0, size / 2, 0, Math.PI * 2)
      ctx.fill()
      break
  }
  ctx.restore()
}

export function renderShape(ctx: CanvasRenderingContext2D, shape: ShapeElement): void {
  const { props, path, fillStyle, lineStyle, shapeStyle, textBlock, fontStyle } = shape
  const { w, h, angle } = props

  ctx.save()
  ctx.globalAlpha = shapeStyle?.alpha ?? 1
  ctx.lineJoin = 'round'

  if (angle) {
    ctx.translate(w / 2, h / 2)
    ctx.rotate((angle * Math.PI) / 180)
    ctx.translate(-w / 2, -h / 2)
  }

  for (const pathDef of path) {
    const actions = resolveActions(pathDef.actions, w, h)
    drawPath(ctx, actions)

    const pf = pathDef.fillStyle || fillStyle
    const pl = pathDef.lineStyle || lineStyle

    if (pf && pf.type !== 'none') {
      applyFillStyle(ctx, pf, w, h)
      ctx.fill()
    }
    if (pl && pl.lineWidth > 0) {
      applyLineStyle(ctx, pl)
      ctx.stroke()
    }
  }

  for (const block of textBlock) {
    const pos = block.position
    const bx = resolveValue(pos.x, w, h)
    const by = resolveValue(pos.y, w, h)
    const bw = resolveValue(pos.w, w, h)
    const bh = resolveValue(pos.h, w, h)
    drawText(ctx, block.text, bx, by, bw, bh, block.fontStyle || fontStyle)
  }

  ctx.restore()
}

export function renderLinker(ctx: CanvasRenderingContext2D, linker: LinkerElement, route: LinkerRoute): void {
  const { points, fromAngle, toAngle } = route
  const { lineStyle, text, fontStyle, linkerType } = linker

  if (points.length < 2) return

  ctx.save()
  applyLineStyle(ctx, lineStyle)

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  if (linkerType === 'curved' && points.length === 4) {
    ctx.bezierCurveTo(points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y)
  } else if (route.jumps && route.jumps.length > 0) {
    drawPolylineWithJumps(ctx, points, route.jumps)
  } else {
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
  }
  ctx.stroke()

  if (lineStyle.beginArrowStyle && lineStyle.beginArrowStyle !== 'none') {
    const angle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x)
    drawArrow(
      ctx,
      points[0].x,
      points[0].y,
      angle + Math.PI,
      lineStyle.lineWidth * 5,
      lineStyle.beginArrowStyle,
      lineStyle.lineColor,
    )
  }

  if (lineStyle.endArrowStyle && lineStyle.endArrowStyle !== 'none') {
    const lastIdx = points.length - 1
    const angle = Math.atan2(points[lastIdx].y - points[lastIdx - 1].y, points[lastIdx].x - points[lastIdx - 1].x)
    drawArrow(
      ctx,
      points[lastIdx].x,
      points[lastIdx].y,
      angle,
      lineStyle.lineWidth * 5,
      lineStyle.endArrowStyle,
      lineStyle.lineColor,
    )
  }

  if (text) {
    const box = getLinkerTextBox(route, text, fontStyle, {
      curved: linkerType === 'curved',
      textPosition: linker.textPosition,
      measureText: line => ctx.measureText(line).width,
    })
    if (!box) {
      ctx.restore()
      return
    }

    ctx.fillStyle = 'white'
    ctx.fillRect(box.x, box.y, box.w, box.h)
    applyFontStyle(ctx, fontStyle)
    ctx.fillStyle = parseColor(fontStyle?.color)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const contentTop = box.y + (box.h - box.lines.length * box.lineHeight) / 2
    for (let i = 0; i < box.lines.length; i++) {
      ctx.fillText(box.lines[i], box.cx, contentTop + i * box.lineHeight + box.lineHeight / 2)
    }
  }

  ctx.restore()
}

function drawPolylineWithJumps(
  ctx: CanvasRenderingContext2D,
  points: LinkerRoute['points'],
  jumps: NonNullable<LinkerRoute['jumps']>,
): void {
  const jumpMap = new Map<number, typeof jumps>()

  for (const jump of jumps) {
    const existing = jumpMap.get(jump.segmentIndex)
    if (existing) existing.push(jump)
    else jumpMap.set(jump.segmentIndex, [jump])
  }

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i]
    const to = points[i + 1]
    const segmentJumps = jumpMap.get(i)

    if (!segmentJumps || segmentJumps.length === 0) {
      ctx.lineTo(to.x, to.y)
      continue
    }

    if (Math.abs(from.y - to.y) < 0.001) {
      drawHorizontalJumpSegment(ctx, from, to, segmentJumps)
      continue
    }

    if (Math.abs(from.x - to.x) < 0.001) {
      drawVerticalJumpSegment(ctx, from, to, segmentJumps)
      continue
    }

    ctx.lineTo(to.x, to.y)
  }
}

function drawHorizontalJumpSegment(
  ctx: CanvasRenderingContext2D,
  from: LinkerRoute['points'][number],
  to: LinkerRoute['points'][number],
  jumps: NonNullable<LinkerRoute['jumps']>,
): void {
  const direction = to.x >= from.x ? 1 : -1
  const ordered = [...jumps].sort((a, b) => direction * (a.center.x - b.center.x))

  for (const jump of ordered) {
    const entryX = jump.center.x - jump.radius * direction
    const exitX = jump.center.x + jump.radius * direction
    ctx.lineTo(entryX, from.y)
    ctx.quadraticCurveTo(jump.center.x, jump.center.y - jump.radius, exitX, from.y)
  }

  ctx.lineTo(to.x, to.y)
}

function drawVerticalJumpSegment(
  ctx: CanvasRenderingContext2D,
  from: LinkerRoute['points'][number],
  to: LinkerRoute['points'][number],
  jumps: NonNullable<LinkerRoute['jumps']>,
): void {
  const direction = to.y >= from.y ? 1 : -1
  const ordered = [...jumps].sort((a, b) => direction * (a.center.y - b.center.y))

  for (const jump of ordered) {
    const entryY = jump.center.y - jump.radius * direction
    const exitY = jump.center.y + jump.radius * direction
    ctx.lineTo(from.x, entryY)
    ctx.quadraticCurveTo(jump.center.x + jump.radius, jump.center.y, from.x, exitY)
  }

  ctx.lineTo(to.x, to.y)
}

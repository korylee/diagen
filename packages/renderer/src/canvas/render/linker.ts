import type { LineStyle, LinkerElement, LinkerRoute } from '@diagen/core'
import { getLinkerTextBox } from '@diagen/core/text'
import { applyFontStyle, applyLineStyle, drawArrow, parseColor } from './primitives'

export interface LinkerRenderOptions {
  overrideStroke?: LineStyle
  suppressText?: boolean
}

export function renderLinker(
  ctx: CanvasRenderingContext2D,
  linker: LinkerElement,
  route: LinkerRoute,
  options: LinkerRenderOptions = {},
): void {
  const { points } = route
  const lineStyle = options.overrideStroke ?? linker.lineStyle

  if (points.length < 2) return

  ctx.save()
  applyLineStyle(ctx, lineStyle)

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  if (linker.linkerType === 'curved' && points.length === 4) {
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
    const lastIndex = points.length - 1
    const angle = Math.atan2(
      points[lastIndex].y - points[lastIndex - 1].y,
      points[lastIndex].x - points[lastIndex - 1].x,
    )
    drawArrow(
      ctx,
      points[lastIndex].x,
      points[lastIndex].y,
      angle,
      lineStyle.lineWidth * 5,
      lineStyle.endArrowStyle,
      lineStyle.lineColor,
    )
  }

  if (!options.suppressText && linker.text) {
    const box = getLinkerTextBox(route, linker.text, linker.fontStyle, {
      curved: linker.linkerType === 'curved',
      textPosition: linker.textPosition,
      measureText: line => ctx.measureText(line).width,
    })
    if (!box) {
      ctx.restore()
      return
    }

    ctx.fillStyle = 'white'
    ctx.fillRect(box.x, box.y, box.w, box.h)
    applyFontStyle(ctx, linker.fontStyle)
    ctx.fillStyle = parseColor(linker.fontStyle?.color)
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

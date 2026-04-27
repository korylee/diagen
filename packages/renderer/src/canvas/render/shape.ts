import type { FillStyle, LineStyle, ShapeElement } from '@diagen/core'
import { resolveActions } from '@diagen/core/path'
import { evaluateExpression as resolveValue } from '@diagen/core/expression'
import { applyFillStyle, applyLineStyle, drawText, tracePath } from './primitives'

export interface ShapeRenderOptions {
  overrideFill?: FillStyle
  overrideStroke?: LineStyle
  suppressText?: boolean
}

export function renderShape(ctx: CanvasRenderingContext2D, shape: ShapeElement, options: ShapeRenderOptions = {}): void {
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
    tracePath(ctx, actions)

    const currentFill = options.overrideFill ?? pathDef.fillStyle ?? fillStyle
    const currentLine = options.overrideStroke ?? pathDef.lineStyle ?? lineStyle

    if (currentFill && currentFill.type !== 'none') {
      applyFillStyle(ctx, currentFill, w, h)
      ctx.fill()
    }
    if (currentLine && currentLine.lineWidth > 0) {
      applyLineStyle(ctx, currentLine)
      ctx.stroke()
    }
  }

  if (!options.suppressText) {
    for (const block of textBlock) {
      const pos = block.position
      const size = { w, h }
      const x = resolveValue(pos.x, size)
      const y = resolveValue(pos.y, size)
      const boxWidth = resolveValue(pos.w, size)
      const boxHeight = resolveValue(pos.h, size)
      drawText(ctx, block.text, x, y, boxWidth, boxHeight, block.fontStyle || fontStyle)
    }
  }

  ctx.restore()
}

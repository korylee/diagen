import type { FillStyle, FontStyle, LineStyle } from '@diagen/core'
import type { ResolvedAction } from '@diagen/core/path'

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
  ctx.textBaseline = fontStyle.verticalAlign
}

export function tracePath(ctx: CanvasRenderingContext2D, actions: ResolvedAction[]): void {
  ctx.beginPath()
  for (const action of actions) {
    switch (action.action) {
      case 'move':
        ctx.moveTo(action.x ?? 0, action.y ?? 0)
        break
      case 'line':
        ctx.lineTo(action.x ?? 0, action.y ?? 0)
        break
      case 'curve':
        ctx.bezierCurveTo(
          action.x1 ?? 0,
          action.y1 ?? 0,
          action.x2 ?? 0,
          action.y2 ?? 0,
          action.x ?? 0,
          action.y ?? 0,
        )
        break
      case 'quadraticCurve':
        ctx.quadraticCurveTo(action.x1 ?? 0, action.y1 ?? 0, action.x ?? 0, action.y ?? 0)
        break
      case 'rect':
        ctx.rect(action.x ?? 0, action.y ?? 0, action.w ?? 0, action.h ?? 0)
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
  if (fontStyle?.verticalAlign === 'middle') startY = y + (h - totalHeight) / 2
  else if (fontStyle?.verticalAlign === 'bottom') startY = y + h - totalHeight

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

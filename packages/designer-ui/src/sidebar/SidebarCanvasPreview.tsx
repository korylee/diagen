import { createEffect } from 'solid-js'

export interface SidebarCanvasPreviewProps {
  shapeId?: string
  linkerId?: string
  class?: string
  width?: number
  height?: number
  accent?: string
}

const DEFAULT_WIDTH = 64
const DEFAULT_HEIGHT = 48

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawPreview(
  ctx: CanvasRenderingContext2D,
  props: SidebarCanvasPreviewProps,
  width: number,
  height: number,
  accent: string,
): void {
  ctx.clearRect(0, 0, width, height)
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = accent
  ctx.fillStyle = accent

  switch (props.shapeId) {
    case 'rectangle':
      drawRoundedRect(ctx, 11, 10, 42, 28, 6)
      ctx.stroke()
      return
    case 'roundedRectangle':
      drawRoundedRect(ctx, 10, 10, 44, 28, 10)
      ctx.stroke()
      return
    case 'circle':
      ctx.beginPath()
      ctx.arc(width / 2, height / 2, 14, 0, Math.PI * 2)
      ctx.stroke()
      return
    case 'diamond':
      ctx.beginPath()
      ctx.moveTo(width / 2, 8)
      ctx.lineTo(width - 12, height / 2)
      ctx.lineTo(width / 2, height - 8)
      ctx.lineTo(12, height / 2)
      ctx.closePath()
      ctx.stroke()
      return
    case 'parallelogram':
      ctx.beginPath()
      ctx.moveTo(18, 10)
      ctx.lineTo(54, 10)
      ctx.lineTo(46, 38)
      ctx.lineTo(10, 38)
      ctx.closePath()
      ctx.stroke()
      return
    case 'ellipse':
      ctx.beginPath()
      ctx.ellipse(width / 2, height / 2, 22, 14, 0, 0, Math.PI * 2)
      ctx.stroke()
      return
    default:
      break
  }

  switch (props.linkerId) {
    case 'straight_linker':
      ctx.beginPath()
      ctx.arc(14, 24, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(50, 24, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(18, 24)
      ctx.lineTo(46, 24)
      ctx.stroke()
      return
    case 'curve_linker':
      ctx.beginPath()
      ctx.arc(14, 30, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(50, 18, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(18, 30)
      ctx.bezierCurveTo(28, 30, 34, 18, 46, 18)
      ctx.stroke()
      return
    case 'linker':
    default:
      ctx.beginPath()
      ctx.arc(14, 24, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(50, 24, 3, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(18, 24)
      ctx.lineTo(28, 24)
      ctx.lineTo(28, 16)
      ctx.lineTo(38, 16)
      ctx.lineTo(38, 30)
      ctx.lineTo(46, 30)
      ctx.stroke()
      return
  }
}

export function SidebarCanvasPreview(props: SidebarCanvasPreviewProps) {
  let canvasRef: HTMLCanvasElement | undefined

  const sync = () => {
    if (!canvasRef) return
    const width = props.width ?? DEFAULT_WIDTH
    const height = props.height ?? DEFAULT_HEIGHT
    const ratio = window.devicePixelRatio || 1

    canvasRef.width = width * ratio
    canvasRef.height = height * ratio
    canvasRef.style.width = `${width}px`
    canvasRef.style.height = `${height}px`

    const ctx = canvasRef.getContext('2d')
    if (!ctx) return

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    drawPreview(ctx, props, width, height, props.accent ?? '#2563eb')
  }

  createEffect(() => {
    props.shapeId
    props.linkerId
    props.width
    props.height
    props.accent
    sync()
  })

  return <canvas ref={canvasRef} class={props.class} aria-hidden="true" />
}

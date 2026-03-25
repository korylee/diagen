import { createEffect, onMount } from 'solid-js'

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
const DEFAULT_ACCENT = '#475569'

function drawMarker(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath()
  ctx.arc(x, y, 2.5, 0, Math.PI * 2)
  ctx.fill()
}

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
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = accent
  ctx.fillStyle = accent

  switch (props.shapeId) {
    case 'rectangle':
      drawRoundedRect(ctx, 12, 10, 40, 26, 4)
      ctx.stroke()
      return
    case 'roundedRectangle':
      drawRoundedRect(ctx, 11, 10, 42, 26, 8)
      ctx.stroke()
      return
    case 'circle':
      ctx.beginPath()
      ctx.arc(width / 2, height / 2, 14, 0, Math.PI * 2)
      ctx.stroke()
      return
    case 'diamond':
      ctx.beginPath()
      ctx.moveTo(width / 2, 9)
      ctx.lineTo(width - 13, height / 2)
      ctx.lineTo(width / 2, height - 9)
      ctx.lineTo(13, height / 2)
      ctx.closePath()
      ctx.stroke()
      return
    case 'parallelogram':
      ctx.beginPath()
      ctx.moveTo(17, 11)
      ctx.lineTo(51, 11)
      ctx.lineTo(45, 37)
      ctx.lineTo(11, 37)
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
      drawMarker(ctx, 14, 24)
      drawMarker(ctx, 50, 24)
      ctx.beginPath()
      ctx.moveTo(18, 24)
      ctx.lineTo(46, 24)
      ctx.stroke()
      return
    case 'curve_linker':
      drawMarker(ctx, 14, 30)
      drawMarker(ctx, 50, 18)
      ctx.beginPath()
      ctx.moveTo(18, 30)
      ctx.bezierCurveTo(28, 30, 34, 18, 46, 18)
      ctx.stroke()
      return
    case 'linker':
    default:
      drawMarker(ctx, 14, 24)
      drawMarker(ctx, 50, 24)
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
    drawPreview(ctx, props, width, height, props.accent ?? DEFAULT_ACCENT)
  }

  createEffect(() => {
    props.shapeId
    props.linkerId
    props.width
    props.height
    props.accent
    sync()
  })
  onMount(() => {
    sync()
  })

  return <canvas ref={canvasRef} class={props.class} aria-hidden="true" />
}

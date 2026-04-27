import type { FillStyle, LineStyle, ShapeElement } from '@diagen/core'
import { createDevicePixelRatio } from '@diagen/primitives'
import { createEffect, createMemo, onMount } from 'solid-js'
import { fitBoundsToViewport, renderShape } from '../render'
import { createPreviewLineWidth, withAlpha } from './previewStyle'

export interface ShapePreviewCanvasProps {
  element: ShapeElement
  width: number
  height: number
  accent: string
  padding: number
  showText: boolean
  class?: string
}

export function ShapePreviewCanvas(props: ShapePreviewCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined

  const pixelRatio = createDevicePixelRatio()
  const bounds = createMemo(() => ({
    x: 0,
    y: 0,
    w: Math.max(props.element.props.w, 1),
    h: Math.max(props.element.props.h, 1),
  }))
  const frame = createMemo(() => fitBoundsToViewport(bounds(), props))
  const previewShape = createMemo<ShapeElement>(() => {
    const lineWidth = createPreviewLineWidth(frame().scale)
    const fillColor = withAlpha(props.accent, 0.08)

    return {
      ...props.element,
      lineStyle: applyPreviewLineStyle(props.element.lineStyle, props.accent, lineWidth),
      fillStyle: applyPreviewFillStyle(props.element.fillStyle, fillColor),
      path: props.element.path.map(pathDef => {
        const fillStyle = pathDef.fillStyle ?? props.element.fillStyle
        const lineStyle = pathDef.lineStyle ?? props.element.lineStyle

        return {
          ...pathDef,
          fillStyle: fillStyle ? applyPreviewFillStyle(fillStyle, fillColor) : fillStyle,
          lineStyle: lineStyle ? applyPreviewLineStyle(lineStyle, props.accent, lineWidth) : lineStyle,
        }
      }),
    }
  })

  const sync = () => {
    if (!canvasRef) return

    const ratio = pixelRatio()
    canvasRef.width = props.width * ratio
    canvasRef.height = props.height * ratio
    canvasRef.style.width = `${props.width}px`
    canvasRef.style.height = `${props.height}px`

    const ctx = canvasRef.getContext('2d')
    if (!ctx) return

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, props.width, props.height)
    ctx.save()
    ctx.translate(frame().offsetX, frame().offsetY)
    ctx.scale(frame().scale, frame().scale)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    renderShape(ctx, previewShape(), { suppressText: !props.showText })
    ctx.restore()
  }

  createEffect(() => {
    props.width
    props.height
    props.accent
    props.padding
    props.showText
    props.class
    props.element
    frame()
    previewShape()
    sync()
  })

  onMount(() => {
    sync()
  })

  return <canvas ref={canvasRef} class={props.class} aria-hidden="true" />
}

function applyPreviewLineStyle(style: LineStyle, accent: string, lineWidth: number): LineStyle {
  return {
    ...style,
    lineColor: accent,
    lineWidth,
  }
}

function applyPreviewFillStyle(style: FillStyle, color: string): FillStyle {
  if (style.type === 'none') return style

  return {
    ...style,
    type: 'solid',
    color,
  }
}

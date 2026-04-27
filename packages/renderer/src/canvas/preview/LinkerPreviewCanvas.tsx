import type { LinkerElement, LinkerRoute } from '@diagen/core'
import { createDevicePixelRatio } from '@diagen/primitives'
import { createEffect, createMemo, onMount } from 'solid-js'
import { fitBoundsToViewport, renderLinker, resolvePreviewBounds } from '../render'
import { createLinkerPreviewRoute } from './previewRoute'
import { createPreviewLineWidth } from './previewStyle'

export interface LinkerPreviewCanvasProps {
  element: LinkerElement
  schemaId: string
  width: number
  height: number
  accent: string
  padding: number
  showText: boolean
  showMarkers: boolean
  class?: string
}

export function LinkerPreviewCanvas(props: LinkerPreviewCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined

  const pixelRatio = createDevicePixelRatio()
  const previewRoute = createMemo(() => createLinkerPreviewRoute(props.element, props))
  const bounds = createMemo(() => resolvePreviewBounds(previewRoute().route.points))
  const frame = createMemo(() => fitBoundsToViewport(bounds(), props))
  const previewLinker = createMemo<LinkerElement>(() => {
    const lineWidth = createPreviewLineWidth(frame().scale)

    return {
      ...props.element,
      lineStyle: {
        ...props.element.lineStyle,
        lineColor: props.accent,
        lineWidth,
      },
    }
  })

  const sync = () => {
    if (!canvasRef) return

    const ratio = pixelRatio()
    const route = previewRoute()
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
    ctx.fillStyle = props.accent
    renderLinker(ctx, previewLinker(), route.route, { suppressText: !props.showText })

    if (props.showMarkers) {
      const radius = 2.5 / frame().scale
      ctx.beginPath()
      for (const point of route.markerPoints) {
        ctx.moveTo(point.x + radius, point.y)
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
      }
      ctx.fill()
    }

    ctx.restore()
  }

  createEffect(() => {
    props.width
    props.height
    props.accent
    props.padding
    props.showText
    props.showMarkers
    props.class
    props.element
    previewRoute()
    frame()
    previewLinker()
    sync()
  })

  onMount(() => {
    sync()
  })

  return <canvas ref={canvasRef} class={props.class} aria-hidden="true" />
}

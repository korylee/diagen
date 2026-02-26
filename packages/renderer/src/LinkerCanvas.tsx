import { onMount, createEffect, on } from 'solid-js'
import type { LinkerElement, ShapeElement } from '@diagen/core'
import type { Rect, Viewport } from '@diagen/shared'
import { isRectVisible } from '@diagen/shared'
import { calculateLinkerRoute, getLinkerBounds, renderLinker } from './linker-utils'
import { useStore } from './StoreProvider'

export interface LinkerCanvasProps {
  linker: LinkerElement
  viewport: Viewport
  viewportSize: { width: number; height: number }
  onMouseDown?: (event: MouseEvent) => void
}

const DPR = window.devicePixelRatio || 1

export function LinkerCanvas(props: LinkerCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined
  let containerRef: HTMLDivElement | undefined

  const { selection, element } = useStore()
  const { isSelected } = selection
  const { getElementById } = element

  const padding = 20

  const getRoute = () => calculateLinkerRoute(props.linker, getElementById)

  const getBounds = (): Rect => getLinkerBounds(getRoute())

  const getScreenPosition = () => {
    const bounds = getBounds()
    return {
      x: bounds.x * props.viewport.zoom,
      y: bounds.y * props.viewport.zoom,
    }
  }

  const getCanvasSize = () => {
    const bounds = getBounds()
    const zoom = props.viewport.zoom
    return {
      width: Math.max(1, Math.ceil(bounds.w * zoom) + padding * 2),
      height: Math.max(1, Math.ceil(bounds.h * zoom) + padding * 2),
    }
  }

  const isVisible = () =>
    isRectVisible(getBounds(), props.viewport, {
      x: 0,
      y: 0,
      w: props.viewportSize.width,
      h: props.viewportSize.height,
    })

  const doRender = () => {
    if (!canvasRef) return
    const ctx = canvasRef.getContext('2d')
    if (!ctx) return

    const size = getCanvasSize()
    const route = getRoute()
    const bounds = getBounds()
    const scale = props.viewport.zoom

    ctx.clearRect(0, 0, size.width * DPR, size.height * DPR)
    ctx.save()
    ctx.scale(DPR, DPR)
    ctx.scale(scale, scale)
    ctx.translate(-bounds.x + padding / scale, -bounds.y + padding / scale)
    renderLinker(ctx, props.linker, route)
    ctx.restore()
  }

  const updateCanvas = () => {
    if (!isVisible()) {
      if (containerRef) containerRef.style.display = 'none'
      return
    }
    if (containerRef) containerRef.style.display = 'block'

    const size = getCanvasSize()
    if (canvasRef) {
      canvasRef.width = size.width * DPR
      canvasRef.height = size.height * DPR
    }
    doRender()
  }

  onMount(() => updateCanvas())

  createEffect(
    on(
      () => [props.linker, props.viewport],
      () => updateCanvas(),
    ),
  )

  const handleMouseDown = (e: MouseEvent) => {
    props.onMouseDown?.(e)
  }

  const pos = () => getScreenPosition()
  const size = () => getCanvasSize()

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${pos().x - padding}px`,
        top: `${pos().y - padding}px`,
        width: `${size().width}px`,
        height: `${size().height}px`,
        cursor: isSelected(props.linker.id) ? 'move' : 'pointer',
        'pointer-events': 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        width={size().width * DPR}
        height={size().height * DPR}
        style={{
          width: `${size().width}px`,
          height: `${size().height}px`,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

import { createEffect, on, onMount } from 'solid-js'
import type { LinkerElement } from '@diagen/core'
import { isRectVisible } from '@diagen/core'
import type { Rect } from '@diagen/shared'
import { calculateLinkerRoute, getLinkerBounds, renderLinker } from '../../utils'
import { useDesigner } from '../../components'

export interface LinkerCanvasProps {
  linker: LinkerElement
  onMouseDown?: (event: MouseEvent) => void
}

const DPR = window.devicePixelRatio || 1

export function LinkerCanvas(props: LinkerCanvasProps) {
  const { view, selection, getElementById } = useDesigner()

  let canvasRef: HTMLCanvasElement | undefined
  let containerRef: HTMLDivElement | undefined

  const padding = 20

  const getRoute = () => calculateLinkerRoute(props.linker, getElementById as any)

  const getBounds = (): Rect => getLinkerBounds(getRoute())

  const getScreenPosition = () => {
    const bounds = getBounds()
    return {
      x: bounds.x * view.viewport().zoom,
      y: bounds.y * view.viewport().zoom,
    }
  }

  const getCanvasSize = () => {
    const bounds = getBounds()
    const zoom = view.viewport().zoom
    return {
      width: Math.max(1, Math.ceil(bounds.w * zoom) + padding * 2),
      height: Math.max(1, Math.ceil(bounds.h * zoom) + padding * 2),
    }
  }

  const isVisible = () =>
    isRectVisible(getBounds(), view.viewport(), {
      x: 0,
      y: 0,
      w: view.canvasSize().width,
      h: view.canvasSize().height,
    })

  const doRender = () => {
    if (!canvasRef) return
    const ctx = canvasRef.getContext('2d')
    if (!ctx) return

    const size = getCanvasSize()
    const route = getRoute()
    const bounds = getBounds()
    const scale = view.viewport().zoom

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
      () => [props.linker, view.viewport()],
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
        cursor: selection.isSelected(props.linker.id) ? 'move' : 'pointer',
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

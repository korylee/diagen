import type { LinkerElement } from '@diagen/core'
import { isBoundsVisible } from '@diagen/core'
import { createDevicePixelRatio } from '@diagen/primitives'
import { createEffect, createMemo } from 'solid-js'
import { useDesigner, useInteraction } from '../../components'
import { renderLinker } from '../../utils'

export interface LinkerCanvasProps {
  linker: LinkerElement
  onMouseDown?: (event: MouseEvent) => boolean
}

export function LinkerCanvas(props: LinkerCanvasProps) {
  const { view, selection } = useDesigner()
  const { coordinate } = useInteraction()
  const pixelRatio = createDevicePixelRatio()
  const layout = createMemo(() => view.getLinkerLayout(props.linker))
  const bounds = createMemo(() => layout().bounds)

  let canvasRef: HTMLCanvasElement | undefined
  let containerRef: HTMLDivElement | undefined

  const padding = 20

  /** 屏幕坐标系中的位置（DOM 定位用） */
  const screenBounds = createMemo(() => {
    const vp = view.viewport()
    const b = bounds()
    
    return {
      x: b.x * vp.zoom + vp.x - padding,
      y: b.y * vp.zoom + vp.y - padding,
      w: b.w * vp.zoom + padding * 2,
      h: b.h * vp.zoom + padding * 2,
    }
  })

  const renderFrame = createMemo(() => {
    const vp = view.viewport()
    const vpSize = view.viewportSize()
    const route = layout().route
    const b = bounds()
    const rect = screenBounds()
    const ratio = pixelRatio()
    const width = Math.max(1, Math.ceil(rect.w))
    const height = Math.max(1, Math.ceil(rect.h))

    return {
      visible: isBoundsVisible(b, vp, { width: vpSize.width, height: vpSize.height }),
      route,
      bounds: b,
      zoom: vp.zoom,
      ratio,
      pixelWidth: width * ratio,
      pixelHeight: height * ratio,
    }
  })

  const renderToCanvas = (frame: ReturnType<typeof renderFrame>) => {
    if (!canvasRef) return
    const ctx = canvasRef.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, frame.pixelWidth, frame.pixelHeight)
    ctx.save()
    ctx.scale(frame.ratio, frame.ratio)
    ctx.scale(frame.zoom, frame.zoom)
    ctx.translate(-frame.bounds.x + padding / frame.zoom, -frame.bounds.y + padding / frame.zoom)
    renderLinker(ctx, props.linker, frame.route)
    ctx.restore()
  }

  const syncCanvas = () => {
    const frame = renderFrame()

    if (!frame.visible) {
      if (containerRef) {
        containerRef.style.display = 'none'
      }
      return
    }

    if (containerRef) {
      containerRef.style.display = 'block'
    }

    if (canvasRef) {
      if (canvasRef.width !== frame.pixelWidth) {
        canvasRef.width = frame.pixelWidth
      }
      if (canvasRef.height !== frame.pixelHeight) {
        canvasRef.height = frame.pixelHeight
      }
    }

    renderToCanvas(frame)
  }

  createEffect(() => {
    syncCanvas()
  })

  const handleMouseDown = (e: MouseEvent) => {
    props.onMouseDown?.(e)
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${screenBounds().x}px`,
        top: `${screenBounds().y}px`,
        width: `${screenBounds().w}px`,
        height: `${screenBounds().h}px`,
        cursor: selection.isSelected(props.linker.id) ? 'move' : 'pointer',
        'pointer-events': 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${screenBounds().w}px`,
          height: `${screenBounds().h}px`,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

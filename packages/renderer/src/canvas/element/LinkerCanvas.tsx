import type { LinkerElement } from '@diagen/core'
import { isBoundsVisible } from '@diagen/core'
import { createDevicePixelRatio } from '@diagen/primitives'
import { expandBounds } from '@diagen/shared'
import { createEffect, createMemo } from 'solid-js'
import { useDesigner } from '../../context'
import { renderLinker } from '../../utils'

export interface LinkerCanvasProps {
  linker: LinkerElement
}

export function LinkerCanvas(props: LinkerCanvasProps) {
  const { view } = useDesigner()
  const pixelRatio = createDevicePixelRatio()
  const layout = createMemo(() => view.getLinkerLayout(props.linker))

  let canvasRef: HTMLCanvasElement | undefined
  let containerRef: HTMLDivElement | undefined

  const padding = 20

  /** 屏幕坐标系中的位置（DOM 定位用） */
  const screenBounds = createMemo(() => {
    // 场景层使用屏幕坐标定位，左/上自动扩展后需要显式走 canvas -> screen 转换
    const b = view.toScreen(layout().bounds)

    return expandBounds(b, padding)
  })

  const renderFrame = createMemo(() => {
    const currentTransform = view.transform()
    const vpSize = view.viewportSize()
    const route = layout().route
    const b = layout().bounds
    const rect = screenBounds()
    const ratio = pixelRatio()
    const width = Math.max(1, Math.ceil(rect.w))
    const height = Math.max(1, Math.ceil(rect.h))

    return {
      visible: isBoundsVisible(b, currentTransform, vpSize, view.originOffset()),
      route,
      bounds: b,
      zoom: currentTransform.zoom,
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

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${screenBounds().x}px`,
        top: `${screenBounds().y}px`,
        width: `${screenBounds().w}px`,
        height: `${screenBounds().h}px`,
        'pointer-events': 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${screenBounds().w}px`,
          height: `${screenBounds().h}px`,
          'pointer-events': 'none',
        }}
      />
    </div>
  )
}

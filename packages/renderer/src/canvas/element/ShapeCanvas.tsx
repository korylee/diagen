import type { ShapeElement } from '@diagen/core'
import { isBoundsVisible } from '@diagen/core'
import { createDevicePixelRatio } from '@diagen/primitives'
import { expandBounds, getRotatedBounds } from '@diagen/shared'
import { createEffect, createMemo } from 'solid-js'
import { useDesigner } from '../../context'
import { renderShape } from '../../utils'

export interface ShapeCanvasProps {
  shape: ShapeElement
}

export function ShapeCanvas(props: ShapeCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined
  let containerRef: HTMLDivElement | undefined

  const { selection, view } = useDesigner()
  const pixelRatio = createDevicePixelRatio()
  const renderBounds = createMemo(() => getRotatedBounds(props.shape.props))

  const padding = 4

  /** 屏幕坐标系中的位置（DOM 定位用） */
  const getScreenBounds = createMemo(() => {
    // 场景层使用屏幕坐标定位，左/上自动扩展后需要显式走 canvas -> screen 转换
    const b = view.toScreen(renderBounds())

    return expandBounds(b, padding)
  })

  const renderFrame = createMemo(() => {
    const currentTransform = view.transform()
    const vpSize = view.viewportSize()
    const bounds = getScreenBounds()
    const rotatedBounds = renderBounds()
    const width = Math.max(1, Math.ceil(bounds.w))
    const height = Math.max(1, Math.ceil(bounds.h))

    return {
      visible: isBoundsVisible(rotatedBounds, currentTransform, vpSize, view.originOffset()),
      zoom: currentTransform.zoom,
      ratio: pixelRatio(),
      pixelWidth: width * pixelRatio(),
      pixelHeight: height * pixelRatio(),
      offsetX: props.shape.props.x - rotatedBounds.x,
      offsetY: props.shape.props.y - rotatedBounds.y,
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
    ctx.translate(frame.offsetX + padding / frame.zoom, frame.offsetY + padding / frame.zoom)
    renderShape(ctx, props.shape)
    ctx.restore()
  }

  const syncCanvas = () => {
    const frame = renderFrame()
    if (!frame.visible) {
      if (containerRef) containerRef.style.display = 'none'
      return
    }
    if (containerRef) containerRef.style.display = 'block'

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
        left: `${getScreenBounds().x}px`,
        top: `${getScreenBounds().y}px`,
        width: `${getScreenBounds().w}px`,
        height: `${getScreenBounds().h}px`,
        cursor: selection.isSelected(props.shape.id) ? 'move' : 'pointer',
        'pointer-events': 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: `${getScreenBounds().w}px`,
          height: `${getScreenBounds().h}px`,
        }}
      />
    </div>
  )
}

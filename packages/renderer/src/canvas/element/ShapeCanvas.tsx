import type { ShapeElement } from '@diagen/core'
import { isBoundsVisible } from '@diagen/core'
import { createDevicePixelRatio } from '@diagen/primitives'
import { getRotatedBoxBounds } from '@diagen/shared'
import { createEffect, createMemo } from 'solid-js'
import { useDesigner } from '../../components'
import { renderShape } from '../../utils'

export interface ShapeCanvasProps {
  shape: ShapeElement
  onMouseDown?: (event: MouseEvent) => void
}

export function ShapeCanvas(props: ShapeCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined
  let containerRef: HTMLDivElement | undefined

  const { selection, view } = useDesigner()
  const pixelRatio = createDevicePixelRatio()
  const renderBounds = createMemo(() =>
    getRotatedBoxBounds({
      x: props.shape.props.x,
      y: props.shape.props.y,
      w: props.shape.props.w,
      h: props.shape.props.h,
      angle: props.shape.props.angle,
    }),
  )

  const padding = 4

  /** 屏幕坐标系中的位置（DOM 定位用） */
  const getScreenBounds = () => {
    const vp = view.viewport()
    const b = renderBounds()
    return {
      x: b.x * vp.zoom + vp.x - padding,
      y: b.y * vp.zoom + vp.y - padding,
      w: b.w * vp.zoom + padding * 2,
      h: b.h * vp.zoom + padding * 2,
    }
  }

  /** 是否在可见区域内 */
  const isVisible = () => {
    const vp = view.viewport()
    const vpSize = view.viewportSize()
    return isBoundsVisible(renderBounds(), vp, { width: vpSize.width, height: vpSize.height })
  }

  const doRender = () => {
    if (!canvasRef) return
    const ctx = canvasRef.getContext('2d')
    if (!ctx) return

    const vp = view.viewport()
    const bounds = getScreenBounds()
    const width = Math.max(1, Math.ceil(bounds.w))
    const height = Math.max(1, Math.ceil(bounds.h))
    const shapeBounds = renderBounds()
    const offsetX = props.shape.props.x - shapeBounds.x
    const offsetY = props.shape.props.y - shapeBounds.y

    ctx.clearRect(0, 0, width * pixelRatio(), height * pixelRatio())
    ctx.save()
    ctx.scale(pixelRatio(), pixelRatio())
    ctx.scale(vp.zoom, vp.zoom)
    ctx.translate(offsetX + padding / vp.zoom, offsetY + padding / vp.zoom)
    renderShape(ctx, props.shape)
    ctx.restore()
  }

  const updateCanvas = () => {
    if (!isVisible()) {
      if (containerRef) containerRef.style.display = 'none'
      return
    }
    if (containerRef) containerRef.style.display = 'block'

    const rect = getScreenBounds()
    const width = Math.max(1, Math.ceil(rect.w))
    const height = Math.max(1, Math.ceil(rect.h))
    if (canvasRef) {
      canvasRef.width = width * pixelRatio()
      canvasRef.height = height * pixelRatio()
    }
    doRender()
  }

  createEffect(() => updateCanvas())

  const handleMouseDown = (e: MouseEvent) => {
    e.stopPropagation()
    props.onMouseDown?.(e)
  }

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
        width={getScreenBounds().w * pixelRatio()}
        height={getScreenBounds().h * pixelRatio()}
        style={{
          width: `${getScreenBounds().w}px`,
          height: `${getScreenBounds().h}px`,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

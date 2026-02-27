import { createEffect } from 'solid-js'
import type { LinkerElement } from '@diagen/core'
import { isRectVisible } from '@diagen/core'
import type { Rect } from '@diagen/shared'
import { calculateLinkerRoute, getLinkerBounds, renderLinker } from '../../utils'
import { useDesigner } from '../../components'
import { createDevicePixelRatio } from '@diagen/primitives'

export interface LinkerCanvasProps {
  linker: LinkerElement
  onMouseDown?: (event: MouseEvent) => void
}

export function LinkerCanvas(props: LinkerCanvasProps) {
  const { view, selection, getElementById } = useDesigner()
  const pixelRatio = createDevicePixelRatio()

  let canvasRef: HTMLCanvasElement | undefined
  let containerRef: HTMLDivElement | undefined

  const padding = 20

  const getRoute = () => calculateLinkerRoute(props.linker, getElementById as any)

  /** 画布坐标系中的边界 */
  const getBounds = (): Rect => getLinkerBounds(getRoute())

  /** 屏幕坐标系中的位置（DOM 定位用） */
  const getScreenRect = () => {
    const vp = view.viewport()
    const bounds = getBounds()
    return {
      x: bounds.x * vp.zoom + vp.x - padding,
      y: bounds.y * vp.zoom + vp.y - padding,
      w: bounds.w * vp.zoom + padding * 2,
      h: bounds.h * vp.zoom + padding * 2,
    }
  }

  /** 是否在可见区域内 */
  const isVisible = () => {
    const vp = view.viewport()
    const pg = view.page()
    return isRectVisible(getBounds(), vp, { width: pg.width, height: pg.height })
  }

  const doRender = () => {
    if (!canvasRef) return
    const ctx = canvasRef.getContext('2d')
    if (!ctx) return

    const vp = view.viewport()
    const rect = getScreenRect()
    const width = Math.max(1, Math.ceil(rect.w))
    const height = Math.max(1, Math.ceil(rect.h))
    const bounds = getBounds()

    ctx.clearRect(0, 0, width * pixelRatio(), height * pixelRatio())
    ctx.save()
    ctx.scale(pixelRatio(), pixelRatio())
    ctx.scale(vp.zoom, vp.zoom)
    ctx.translate(-bounds.x + padding / vp.zoom, -bounds.y + padding / vp.zoom)
    renderLinker(ctx, props.linker, getRoute())
    ctx.restore()
  }

  const updateCanvas = () => {
    if (!isVisible()) {
      if (containerRef) containerRef.style.display = 'none'
      return
    }
    if (containerRef) containerRef.style.display = 'block'

    const rect = getScreenRect()
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

  const screenRect = () => getScreenRect()

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${screenRect().x}px`,
        top: `${screenRect().y}px`,
        width: `${screenRect().w}px`,
        height: `${screenRect().h}px`,
        cursor: selection.isSelected(props.linker.id) ? 'move' : 'pointer',
        'pointer-events': 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        width={screenRect().w * pixelRatio()}
        height={screenRect().h * pixelRatio()}
        style={{
          width: `${screenRect().w}px`,
          height: `${screenRect().h}px`,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

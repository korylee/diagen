import { createEffect } from 'solid-js'
import type { ShapeElement } from '@diagen/core'
import { pick, type Rect } from '@diagen/shared'
import { isRectVisible } from '@diagen/core'
import { renderShape } from '../../utils'
import { useDesigner } from '../../components'

export interface ShapeCanvasProps {
  shape: ShapeElement
  onMouseDown?: (event: MouseEvent) => void
}

const DPR = window.devicePixelRatio || 1

export function ShapeCanvas(props: ShapeCanvasProps) {
  let canvasRef: HTMLCanvasElement | undefined
  let containerRef: HTMLDivElement | undefined

  const { selection, view } = useDesigner()
  const { isSelected } = selection

  const padding = 4

  /** 画布坐标系中的边界 */
  const getBounds = (): Rect => pick(props.shape.props, ['x', 'y', 'w', 'h'])

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

    ctx.clearRect(0, 0, width * DPR, height * DPR)
    ctx.save()
    ctx.scale(DPR, DPR)
    ctx.scale(vp.zoom, vp.zoom)
    ctx.translate(padding / vp.zoom, padding / vp.zoom)
    renderShape(ctx, props.shape)
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
      canvasRef.width = width * DPR
      canvasRef.height = height * DPR
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
        cursor: isSelected(props.shape.id) ? 'move' : 'pointer',
        'pointer-events': 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        width={screenRect().w * DPR}
        height={screenRect().h * DPR}
        style={{
          width: `${screenRect().w}px`,
          height: `${screenRect().h}px`,
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  )
}

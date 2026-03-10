import type { LinkerElement } from '@diagen/core'
import { isBoundsVisible } from '@diagen/core'
import { createDevicePixelRatio } from '@diagen/primitives'
import { createEffect, createMemo } from 'solid-js'
import { useDesigner } from '../../components'
import { renderLinker } from '../../utils'

export interface LinkerCanvasProps {
  linker: LinkerElement
  onMouseDown?: (event: MouseEvent) => boolean
}

export function LinkerCanvas(props: LinkerCanvasProps) {
  const { view, selection } = useDesigner()
  const pixelRatio = createDevicePixelRatio()
  const layout = createMemo(() => {
    return view.getLinkerLayout(props.linker)
  })
  const route = createMemo(() => layout().route)
  const bounds = createMemo(() => layout().bounds)

  let canvasRef: HTMLCanvasElement | undefined
  let containerRef: HTMLDivElement | undefined

  const padding = 20

  /** 屏幕坐标系中的位置（DOM 定位用） */
  const getScreenBounds = createMemo(() => {
    const vp = view.viewport()
    const b = bounds()
    return {
      x: b.x * vp.zoom + vp.x - padding,
      y: b.y * vp.zoom + vp.y - padding,
      w: b.w * vp.zoom + padding * 2,
      h: b.h * vp.zoom + padding * 2,
    }
  })

  /** 是否在可见区域内 */
  const isVisible = () => {
    const vp = view.viewport()
    const vpSize = view.viewportSize()
    return isBoundsVisible(bounds(), vp, { width: vpSize.width, height: vpSize.height })
  }

  const doRender = () => {
    if (!canvasRef) return
    const ctx = canvasRef.getContext('2d')
    if (!ctx) return

    const vp = view.viewport()
    const rect = getScreenBounds()
    const width = Math.max(1, Math.ceil(rect.w))
    const height = Math.max(1, Math.ceil(rect.h))
    const b = bounds()
    const linkerRoute = route()

    ctx.clearRect(0, 0, width * pixelRatio(), height * pixelRatio())
    ctx.save()
    ctx.scale(pixelRatio(), pixelRatio())
    ctx.scale(vp.zoom, vp.zoom)
    ctx.translate(-b.x + padding / vp.zoom, -b.y + padding / vp.zoom)
    renderLinker(ctx, props.linker, linkerRoute)
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

  createEffect(() => {
    // 路径变化但外包框不变时，仍需强制重绘。
    route()
    updateCanvas()
  })

  const handleMouseDown = (e: MouseEvent) => {
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
        cursor: selection.isSelected(props.linker.id) ? 'move' : 'pointer',
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

import { type Bounds, type Point, type Size } from '@diagen/shared'
import type { Accessor } from 'solid-js'
import { clampZoom, type Transform } from '../../../transform'

interface CreateViewNavigationOptions {
  transform: Accessor<Transform>
  viewportSize: Accessor<Size>
  originOffset: Accessor<Point>
  selectionBounds: Accessor<Bounds | null>
  getContentBounds: () => Bounds
  setTransform: (next: Transform | Partial<Transform>) => void
  onNavigated: () => void
}

export function resolveCenteredTransform(params: {
  point: Point
  viewportSize: Size
  zoom: number
  originOffset: Point
}): Pick<Transform, 'x' | 'y'> {
  const { point, viewportSize, zoom, originOffset } = params
  return {
    x: viewportSize.width / 2 - point.x * zoom - originOffset.x,
    y: viewportSize.height / 2 - point.y * zoom - originOffset.y,
  }
}

export function resolveFittedTransform(params: {
  bounds: Bounds
  viewportSize: Size
  originOffset: Point
}): Transform {
  const { bounds, viewportSize, originOffset } = params
  const zoomX = viewportSize.width / bounds.w
  const zoomY = viewportSize.height / bounds.h
  const zoom = clampZoom(Math.min(zoomX, zoomY))

  return {
    zoom,
    x: (viewportSize.width - bounds.w * zoom) / 2 - bounds.x * zoom - originOffset.x,
    y: (viewportSize.height - bounds.h * zoom) / 2 - bounds.y * zoom - originOffset.y,
  }
}

export function createViewNavigation(options: CreateViewNavigationOptions) {
  const { transform, viewportSize, originOffset, selectionBounds, getContentBounds, setTransform, onNavigated } = options

  const commitNavigation = (next: Transform) => {
    setTransform(next)
    onNavigated()
  }

  function setZoom(val: number, center?: Point): void {
    const newZoom = clampZoom(val)

    if (center) {
      const currentTransform = transform()
      setTransform({
        zoom: newZoom,
        // center 使用画布坐标。保持该画布点视觉位置不变时，transform 只需补偿缩放前后的画布位移差。
        x: currentTransform.x + center.x * (currentTransform.zoom - newZoom),
        y: currentTransform.y + center.y * (currentTransform.zoom - newZoom),
      })
      return
    }

    setTransform({ zoom: newZoom })
  }

  function setPan(x: number, y: number): void {
    setTransform({ x, y })
  }

  function pan(deltaX: number, deltaY: number): void {
    const currentTransform = transform()
    setPan(currentTransform.x + deltaX, currentTransform.y + deltaY)
  }

  function centerTo(point: Point): void {
    commitNavigation({
      ...transform(),
      ...resolveCenteredTransform({
        point,
        viewportSize: viewportSize(),
        zoom: transform().zoom,
        originOffset: originOffset(),
      }),
    })
  }

  function fitBounds(bounds: Bounds | null): void {
    if (!bounds) return
    if (bounds.w <= 0 || bounds.h <= 0) {
      setZoom(1)
      return
    }

    commitNavigation(
      resolveFittedTransform({
        bounds,
        viewportSize: viewportSize(),
        originOffset: originOffset(),
      }),
    )
  }

  function fitToContent(): void {
    fitBounds(getContentBounds())
  }

  function fitToSelection(): void {
    fitBounds(selectionBounds())
  }

  function zoomIn(): void {
    setZoom(transform().zoom + 0.1)
  }

  function zoomOut(): void {
    setZoom(transform().zoom - 0.1)
  }

  return {
    setZoom,
    setPan,
    pan,
    centerTo,
    fitBounds,
    fitToContent,
    fitToSelection,
    zoomIn,
    zoomOut,
  }
}

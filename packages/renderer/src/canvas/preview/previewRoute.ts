import type { LinkerElement, LinkerRoute } from '@diagen/core'
import type { Point } from '@diagen/shared'

export interface LinkerPreviewRoute {
  route: LinkerRoute
  markerPoints: Point[]
}

export function createLinkerPreviewRoute(
  linker: Pick<LinkerElement, 'linkerType'>,
  params: { width: number; height: number; padding: number },
): LinkerPreviewRoute {
  const { width, height, padding } = params
  const centerY = height / 2
  const topY = centerY - 7
  const bottomY = centerY + 7
  const leftX = padding + 8
  const rightX = width - padding - 8
  let points: Point[]

  if (linker.linkerType === 'straight') {
    points = [
      { x: leftX, y: centerY },
      { x: rightX, y: centerY },
    ]
  } else if (linker.linkerType === 'curved') {
    points = [
      { x: leftX, y: bottomY },
      { x: leftX + 16, y: bottomY },
      { x: rightX - 16, y: topY },
      { x: rightX, y: topY },
    ]
  } else {
    points = [
      { x: leftX, y: centerY },
      { x: width * 0.42, y: centerY },
      { x: width * 0.42, y: topY },
      { x: width * 0.58, y: topY },
      { x: width * 0.58, y: bottomY },
      { x: rightX, y: bottomY },
    ]
  }

  return {
    route: {
      points,
      fromAngle: 0,
      toAngle: 0,
    },
    markerPoints: [points[0], points[points.length - 1]],
  }
}

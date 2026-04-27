import { describe, expect, it } from 'vitest'
import { createLinkerPreviewRoute } from './previewRoute'

describe('createLinkerPreviewRoute', () => {
  it('应为 straight linker 生成水平路径与 marker', () => {
    const preview = createLinkerPreviewRoute(
      { linkerType: 'straight' },
      { width: 64, height: 48, padding: 6 },
    )

    expect(preview.route.points).toEqual([
      { x: 14, y: 24 },
      { x: 50, y: 24 },
    ])
    expect(preview.markerPoints).toEqual([
      { x: 14, y: 24 },
      { x: 50, y: 24 },
    ])
  })

  it('应为 orthogonal linker 生成折线路径', () => {
    const preview = createLinkerPreviewRoute(
      { linkerType: 'orthogonal' },
      { width: 112, height: 72, padding: 8 },
    )

    expect(preview.route.points).toHaveLength(6)
    expect(preview.markerPoints).toEqual([
      preview.route.points[0],
      preview.route.points[preview.route.points.length - 1],
    ])
  })
})

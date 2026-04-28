import { describe, expect, it } from 'vitest'
import { DEFAULTS } from '../constants'
import { createPage } from './page'

describe('model/page', () => {
  it('应使用 core 默认值创建页面配置', () => {
    const page = createPage()

    expect(page.name).toBe('Page 1')
    expect(page.backgroundColor).toBe(DEFAULTS.page.background)
    expect(page.width).toBe(DEFAULTS.page.width)
    expect(page.height).toBe(DEFAULTS.page.height)
    expect(page.padding).toBe(DEFAULTS.page.padding)
    expect(page.margin).toBe(DEFAULTS.page.margin)
    expect(page.showGrid).toBe(DEFAULTS.grid.show)
    expect(page.gridSize).toBe(DEFAULTS.grid.size)
    expect(page.gridColor).toBe(DEFAULTS.grid.color)
    expect(page.gridStyle).toBe(DEFAULTS.page.gridStyle)
    expect(page.orientation).toBe(DEFAULTS.page.orientation)
    expect(page.lineJumps).toBe(DEFAULTS.page.lineJumps)
  })

  it('应允许通过 overrides 覆盖默认值', () => {
    const page = createPage({
      id: 'page_custom',
      backgroundColor: '#f0f0f0',
      width: 1440,
      showGrid: false,
      lineJumps: true,
    })

    expect(page.id).toBe('page_custom')
    expect(page.backgroundColor).toBe('#f0f0f0')
    expect(page.width).toBe(1440)
    expect(page.showGrid).toBe(false)
    expect(page.lineJumps).toBe(true)
  })
})

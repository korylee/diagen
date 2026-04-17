import { describe, expect, it } from 'vitest'
import { DEFAULTS } from '../constants'
import { createPage } from './page'

describe('model/page', () => {
  it('应使用 core 默认值创建页面配置', () => {
    const page = createPage()

    expect(page.name).toBe('Page 1')
    expect(page.backgroundColor).toBe(DEFAULTS.PAGE_BACKGROUND)
    expect(page.width).toBe(DEFAULTS.PAGE_WIDTH)
    expect(page.height).toBe(DEFAULTS.PAGE_HEIGHT)
    expect(page.padding).toBe(DEFAULTS.PAGE_PADDING)
    expect(page.showGrid).toBe(DEFAULTS.SHOW_GRID)
    expect(page.gridSize).toBe(DEFAULTS.GRID_SIZE)
    expect(page.gridColor).toBe(DEFAULTS.GRID_COLOR)
    expect(page.lineJumps).toBe(DEFAULTS.LINE_JUMPS)
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

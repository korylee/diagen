/**
 * 页面配置模型
 */

import { DeepPartial, generateId } from '@diagen/shared'
import { DEFAULTS } from '../constants'

/** 页面配置 */
export interface DiagramPage {
  id: string
  name: string
  backgroundColor: string
  width: number
  height: number
  padding: number
  margin: number
  showGrid: boolean
  gridSize: number
  gridColor: string
  gridStyle: 'dot' | 'line' | 'cross'
  orientation: 'portrait' | 'landscape'
  lineJumps?: boolean
}

export function createPage(overrides: DeepPartial<DiagramPage> = {}) {
  const id = overrides.id || generateId('page')

  return {
    id,
    name: 'Page 1',
    // 页面默认背景统一复用 core 默认值，避免常量与模型实现漂移。
    backgroundColor: DEFAULTS.page.background,
    width: DEFAULTS.page.width,
    height: DEFAULTS.page.height,
    padding: DEFAULTS.page.padding,
    margin: DEFAULTS.page.margin,
    showGrid: DEFAULTS.grid.show,
    gridSize: DEFAULTS.grid.size,
    gridColor: DEFAULTS.grid.color,
    gridStyle: DEFAULTS.page.gridStyle,
    orientation: DEFAULTS.page.orientation,
    lineJumps: DEFAULTS.page.lineJumps,
    ...overrides,
  } as DiagramPage
}

/**
 * 页面配置模型
 */

import { DeepPartial, generateId } from '@diagen/shared'

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
    backgroundColor: 'rgb(255, 255, 255)',
    width: 1050,
    height: 1000,
    padding: 20,
    margin: 800,
    showGrid: true,
    gridSize: 15,
    gridColor: '#e0e0e0',
    gridStyle: 'line',
    orientation: 'portrait',
    lineJumps: false,
    ...overrides,
  } as DiagramPage
}

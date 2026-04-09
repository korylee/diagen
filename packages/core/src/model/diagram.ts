/**
 * 图表模型 - 根数据结构
 */

import type { ShapeElement } from './shape'
import type { LinkerElement } from './linker'
import { createPage, DiagramPage } from './page'
import type { Theme } from './types'
import { DeepPartial, generateId } from '@diagen/shared'

export type DiagramElement = ShapeElement | LinkerElement

/** 完整图表模型 */
export interface Diagram {
  id: string
  name: string
  version: string

  /** 元素映射表（规范化存储） */
  elements: Record<string, DiagramElement>

  /** 渲染顺序列表 */
  orderList: string[]

  /** 页面配置 */
  page: DiagramPage

  /** 主题 */
  theme?: Theme

  /** 元数据 */
  createdAt: number
  updatedAt: number
  createdBy?: string

  /** 自定义属性 */
  properties?: Record<string, unknown>
}

export function createDiagram(overrides: DeepPartial<Diagram> = {}) {
  const id = overrides.id || generateId('diagram')
  const now = Date.now()
  return {
    id,
    name: 'Untitled Diagram',
    version: '1.0.0',
    elements: {},
    orderList: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
    page: createPage(overrides.page),
  } as Diagram
}

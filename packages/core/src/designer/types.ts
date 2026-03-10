import type { Emitter, Size } from '@diagen/shared'
import type { Diagram } from '../model'
import type { Viewport } from '../utils'
import type { ElementEvents, HistoryEvents, SelectionEvents } from './managers'

/** 画布自增配置 */
export interface AutoGrowConfig {
  /** 是否启用自动扩容 */
  enabled: boolean
  /** 元素越界后额外预留的安全边距（px） */
  growPadding: number
  /** 扩容步进（px），避免每次仅扩几像素导致频繁重排 */
  growStep: number
  /** 最大宽度保护阈值（px） */
  maxWidth: number
  /** 最大高度保护阈值（px） */
  maxHeight: number
  /** 是否允许自动回缩 */
  shrink: boolean
  /** 回缩时保留的内容边距（px） */
  shrinkPadding: number
}

/** 外部传入的编辑器配置（可选） */
export interface EditorConfig {
  panelItemWidth: number
  panelItemHeight: number
  anchorSize: number
  rotaterSize: number
  anchorColor: string
  selectorColor: string
  autoGrow: AutoGrowConfig
}

/** 编辑器状态 */
export interface EditorState {
  /** 图表数据 */
  diagram: Diagram
  /** 视口变换参数：x, y 为偏移，zoom 为缩放级别 */
  viewport: Viewport

  /** 视口窗口尺寸（可见区域） */
  viewportSize: Size

  /** 滚动容器尺寸（可滚动内容区域） */
  containerSize: Size

  /** ui及性能配置 */
  config: EditorConfig
}

export type DesignerEmitter = Emitter<
  ElementEvents &
    HistoryEvents &
    SelectionEvents & {
      [k: string]: any
    }
>

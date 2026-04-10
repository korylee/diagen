import type { Emitter, Point, Size } from '@diagen/shared'
import type { LinkerType } from '../constants'
import type { Diagram } from '../model'
import type { LinkerRouteStrategy, RouteConfig, RouteOptions } from '../route'
import type { Transform } from '../transform'
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

export interface LinkerRouteConfig {
  /** 按连线类型分发主链路策略 */
  strategies: Record<LinkerType, LinkerRouteStrategy>
  /** 障碍规避的基础配置 */
  obstacleConfig: Partial<RouteConfig>
  /** 障碍规避的算法选择与参数 */
  obstacleOptions: RouteOptions
  /** 跳线半径（canvas 坐标） */
  lineJumpRadius: number
}

export type DesignerToolState =
  | { type: 'idle' }
  | {
      type: 'create-shape'
      shapeId: string
      continuous: boolean
    }
  | {
      type: 'create-linker'
      linkerId: string
      continuous: boolean
    }

/** 外部传入的编辑器配置（可选） */
export interface EditorConfig {
  panelItemWidth: number
  panelItemHeight: number
  anchorSize: number
  rotaterSize: number
  anchorColor: string
  selectorColor: string
  /** 画布容器外圈缓冲区（运行时，不持久化） */
  containerInset: number
  autoGrow: AutoGrowConfig
  linkerRoute: LinkerRouteConfig
}

/** 编辑器状态 */
export interface EditorState {
  /** 图表数据 */
  diagram: Diagram

  /** 画布变换参数：x, y 为偏移，zoom 为缩放级别 */
  transform: Transform

  /** 视口窗口尺寸（可见区域） */
  viewportSize: Size

  /** 世界尺寸（可滚动内容区域） */
  worldSize: Size

  /** 画布原点相对容器左上角的运行时偏移（不持久化） */
  originOffset: Point

  /** ui及性能配置 */
  config: EditorConfig

  /** 工具态（运行时，不持久化） */
  tool: DesignerToolState
}

export type DesignerEmitter = Emitter<
  ElementEvents &
    HistoryEvents &
    SelectionEvents & {
      [k: string]: any
    }
>

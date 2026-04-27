import { DEFAULTS } from '@diagen/core'
import type { DeepPartial } from '@diagen/shared'

export interface RendererInteractionDefaults {
  panButton: number
  shapeDragThreshold: number
  /** shape 拖拽吸附容差（画布坐标） */
  shapeGuideTolerance?: number
  linkerDragThreshold: number
  linkerSnapDistance: number
  linkerSnapOnMove: boolean
  linkerSnapStickDistance: number
  linkerDirectionBias: number
  linkerAllowSelfConnect: boolean
  resizeMinWidth: number
  resizeMinHeight: number
  /** resize 吸附容差（画布坐标） */
  resizeGuideTolerance?: number
  boxSelectMinSize: number
  rotateThreshold: number
  rotateSnapStep: number
}

export interface RendererZoomDefaults {
  min: number
  max: number
  step: number
}

export interface RendererDefaults {
  interaction: RendererInteractionDefaults
  zoom: RendererZoomDefaults
}

export type RendererDefaultsOverrides = DeepPartial<RendererDefaults>

export const RENDERER_DEFAULTS: RendererDefaults = {
  interaction: {
    panButton: 1,
    shapeDragThreshold: 3,
    shapeGuideTolerance: undefined,
    linkerDragThreshold: 3,
    linkerSnapDistance: 12,
    linkerSnapOnMove: true,
    linkerSnapStickDistance: 8,
    linkerDirectionBias: 0.35,
    linkerAllowSelfConnect: true,
    resizeMinWidth: 20,
    resizeMinHeight: 20,
    resizeGuideTolerance: undefined,
    boxSelectMinSize: 5,
    rotateThreshold: 2,
    rotateSnapStep: 15,
  },
  zoom: {
    min: DEFAULTS.MIN_ZOOM,
    max: DEFAULTS.MAX_ZOOM,
    step: DEFAULTS.ZOOM_STEP,
  },
}

export function mergeRendererDefaults(base: RendererDefaults, overrides?: RendererDefaultsOverrides): RendererDefaults {
  if (!overrides) {
    return base
  }

  // 仅按域浅合并：调用方通过完整子对象控制最终行为，避免隐式递归带来不可预期覆盖。
  return {
    interaction: {
      ...base.interaction,
      ...overrides.interaction,
    },
    zoom: {
      ...base.zoom,
      ...overrides.zoom,
    },
  }
}

export function resolveRendererDefaults(overrides?: RendererDefaultsOverrides): RendererDefaults {
  return mergeRendererDefaults(RENDERER_DEFAULTS, overrides)
}

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

export type RendererDefaults = RendererInteractionDefaults

export type RendererDefaultsOverrides = DeepPartial<RendererDefaults>

export const RENDERER_DEFAULTS: RendererDefaults = {
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
}

export function resolveRendererDefaults(overrides?: RendererDefaultsOverrides): RendererDefaults {
  return { ...RENDERER_DEFAULTS, ...overrides }
}

import type { DesignerToolState } from '@diagen/core'
import type { Point } from '@diagen/shared'
import type { SceneHit, SceneLinkerHit } from '../utils'

export type ContainerCursor = 'default' | 'crosshair' | 'grabbing'

export type ScenePrimaryIntent =
  | { type: 'create-shape'; shapeId: string; continuous: boolean; point: Point }
  | { type: 'create-linker'; linkerId: string; continuous: boolean; point: Point; sceneHit: SceneHit | null }
  | { type: 'edit-linker'; point: Point; sceneHit: SceneLinkerHit }
  | { type: 'interact-shape'; point: Point; shapeId: string }
  | { type: 'blank' }

export function resolveContainerCursor(params: {
  isGrabbing: boolean
  toolType: DesignerToolState['type']
}): ContainerCursor {
  const { isGrabbing, toolType } = params
  if (isGrabbing) return 'grabbing'

  if (toolType === 'create-shape' || toolType === 'create-linker') {
    return 'crosshair'
  }

  return 'default'
}

export function resolveScenePrimaryIntent(params: {
  tool: DesignerToolState
  point: Point
  sceneHit: SceneHit | null
}): ScenePrimaryIntent {
  const { tool, point, sceneHit } = params

  if (tool.type === 'create-shape') {
    return {
      type: 'create-shape',
      point,
      shapeId: tool.shapeId,
      continuous: tool.continuous,
    }
  }

  if (tool.type === 'create-linker') {
    return {
      type: 'create-linker',
      point,
      linkerId: tool.linkerId,
      continuous: tool.continuous,
      sceneHit,
    }
  }

  if (sceneHit?.type === 'linker') {
    return {
      type: 'edit-linker',
      point,
      sceneHit,
    }
  }

  if (sceneHit?.type === 'shape') {
    return {
      type: 'interact-shape',
      point,
      shapeId: sceneHit.element.id,
    }
  }

  return { type: 'blank' }
}

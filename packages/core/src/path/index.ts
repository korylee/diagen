import type { Point } from '@diagen/shared'
import type { PathAction, PathDefinition } from '../model'
import { Schema } from '../schema'
import { compileExpression, evaluateCompiled, evaluateExpression, type CompiledExpression } from '../expression'

export interface ResolvedAction {
  action: PathAction['action']
  x?: number
  y?: number
  w?: number
  h?: number
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export interface CompiledAction {
  action: PathAction['action']
  x?: CompiledExpression | number
  y?: CompiledExpression | number
  w?: CompiledExpression | number
  h?: CompiledExpression | number
  x1?: CompiledExpression | number
  y1?: CompiledExpression | number
  x2?: CompiledExpression | number
  y2?: CompiledExpression | number
}

interface PathActionRef {
  ref: string
}

function isPathActionRef(value: unknown): value is PathActionRef {
  return typeof value === 'object' && value !== null && 'ref' in value
}

export function resolveValue(value: number | string | undefined, w: number, h: number): number {
  if (value === undefined) return 0
  return evaluateExpression(value, w, h, 0)
}

export function resolvePoint(x: number | string, y: number | string, w: number, h: number): Point {
  return {
    x: resolveValue(x, w, h),
    y: resolveValue(y, w, h),
  }
}

export function resolvePoints(
  anchors: Array<{ x: number | string; y: number | string }>,
  w: number,
  h: number,
): Point[] {
  return anchors.map(anchor => resolvePoint(anchor.x, anchor.y, w, h))
}

export function compileActions(actions: PathDefinition['actions']): CompiledAction[] {
  return actions.map(action => {
    const compiled: CompiledAction = { action: action.action }
    if (action.x !== undefined) {
      compiled.x = typeof action.x === 'number' ? action.x : (compileExpression(action.x) ?? 0)
    }
    if (action.y !== undefined) {
      compiled.y = typeof action.y === 'number' ? action.y : (compileExpression(action.y) ?? 0)
    }
    if (action.w !== undefined) {
      compiled.w = typeof action.w === 'number' ? action.w : (compileExpression(action.w) ?? 0)
    }
    if (action.h !== undefined) {
      compiled.h = typeof action.h === 'number' ? action.h : (compileExpression(action.h) ?? 0)
    }
    if (action.x1 !== undefined) {
      compiled.x1 = typeof action.x1 === 'number' ? action.x1 : (compileExpression(action.x1) ?? 0)
    }
    if (action.y1 !== undefined) {
      compiled.y1 = typeof action.y1 === 'number' ? action.y1 : (compileExpression(action.y1) ?? 0)
    }
    if (action.x2 !== undefined) {
      compiled.x2 = typeof action.x2 === 'number' ? action.x2 : (compileExpression(action.x2) ?? 0)
    }
    if (action.y2 !== undefined) {
      compiled.y2 = typeof action.y2 === 'number' ? action.y2 : (compileExpression(action.y2) ?? 0)
    }
    return compiled
  })
}

export function evaluateAction(action: CompiledAction, w: number, h: number): ResolvedAction {
  const resolved: ResolvedAction = { action: action.action }
  if (action.x !== undefined) resolved.x = typeof action.x === 'number' ? action.x : evaluateCompiled(action.x, w, h, 0)
  if (action.y !== undefined) resolved.y = typeof action.y === 'number' ? action.y : evaluateCompiled(action.y, w, h, 0)
  if (action.w !== undefined) resolved.w = typeof action.w === 'number' ? action.w : evaluateCompiled(action.w, w, h, 0)
  if (action.h !== undefined) resolved.h = typeof action.h === 'number' ? action.h : evaluateCompiled(action.h, w, h, 0)
  if (action.x1 !== undefined) {
    resolved.x1 = typeof action.x1 === 'number' ? action.x1 : evaluateCompiled(action.x1, w, h, 0)
  }
  if (action.y1 !== undefined) {
    resolved.y1 = typeof action.y1 === 'number' ? action.y1 : evaluateCompiled(action.y1, w, h, 0)
  }
  if (action.x2 !== undefined) {
    resolved.x2 = typeof action.x2 === 'number' ? action.x2 : evaluateCompiled(action.x2, w, h, 0)
  }
  if (action.y2 !== undefined) {
    resolved.y2 = typeof action.y2 === 'number' ? action.y2 : evaluateCompiled(action.y2, w, h, 0)
  }
  return resolved
}

function resolveSingleAction(action: PathAction, w: number, h: number): ResolvedAction {
  const resolved: ResolvedAction = { action: action.action }
  if (action.x !== undefined) resolved.x = resolveValue(action.x, w, h)
  if (action.y !== undefined) resolved.y = resolveValue(action.y, w, h)
  if (action.w !== undefined) resolved.w = resolveValue(action.w, w, h)
  if (action.h !== undefined) resolved.h = resolveValue(action.h, w, h)
  if (action.x1 !== undefined) resolved.x1 = resolveValue(action.x1, w, h)
  if (action.y1 !== undefined) resolved.y1 = resolveValue(action.y1, w, h)
  if (action.x2 !== undefined) resolved.x2 = resolveValue(action.x2, w, h)
  if (action.y2 !== undefined) resolved.y2 = resolveValue(action.y2, w, h)
  return resolved
}

export function resolveActions(
  actions: PathDefinition['actions'] | PathAction | PathActionRef,
  w: number,
  h: number,
): ResolvedAction[] {
  if (isPathActionRef(actions)) {
    const globalActions = Schema.getGlobalCommand(actions.ref)
    if (!Array.isArray(globalActions)) return []
    return resolveActions(globalActions as PathAction[], w, h)
  }

  const actionList = Array.isArray(actions) ? actions : [actions]
  return actionList.map(action => resolveSingleAction(action, w, h))
}

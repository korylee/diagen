import { ensureArray, isObject, type Point } from '@diagen/shared'
import type { PathAction, PathDefinition } from '../model'
import { Schema } from '../schema'
import { compileExpression, evaluateCompiled, evaluateExpression, type CompiledExpression } from '../expression'

const NUMERIC_FIELDS = ['x', 'y', 'w', 'h', 'x1', 'y1', 'x2', 'y2'] as const

type NumericField = (typeof NUMERIC_FIELDS)[number]

export interface ResolvedAction extends Partial<Record<NumericField, number>> {
  action: PathAction['action']
}

export interface CompiledAction extends Partial<Record<NumericField, CompiledExpression | number>> {
  action: PathAction['action']
}

interface PathActionRef {
  ref: string
}

function isPathActionRef(value: unknown): value is PathActionRef {
  return isObject(value) && 'ref' in value
}

export function compileActions(actions: PathDefinition['actions']): CompiledAction[] {
  return actions.map(action => {
    const compiled: CompiledAction = { action: action.action }
    for (const field of NUMERIC_FIELDS) {
      if (action[field] !== undefined) {
        compiled[field] = typeof action[field] === 'number' ? action[field] : (compileExpression(action[field]) ?? 0)
      }
    }
    return compiled
  })
}

export function evaluateAction(action: CompiledAction, w: number, h: number): ResolvedAction {
  const resolved: ResolvedAction = { action: action.action }
  for (const field of NUMERIC_FIELDS) {
    const value = action[field]
    if (value !== undefined) {
      resolved[field] = typeof value === 'number' ? value : evaluateCompiled(value, { w, h })
    }
  }
  return resolved
}

function resolveSingleAction(action: PathAction, w: number, h: number): ResolvedAction {
  const resolved: ResolvedAction = { action: action.action }
  for (const field of NUMERIC_FIELDS) {
    const value = action[field]
    if (value !== undefined) {
      resolved[field] = evaluateExpression(value, { w, h })
    }
  }
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

  const actionList = ensureArray(actions)
  return actionList.map(action => resolveSingleAction(action, w, h))
}

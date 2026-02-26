import type { ShapeElement, PathDefinition } from '@diagen/core/model';
import type { CompiledExpression } from './expression-compiler';
import { compileExpression } from './expression-compiler';

export interface CachedPath {
  pathId: string;
  compiledActions: CompiledPathAction[];
  lastModified: number;
}

export interface CompiledPathAction {
  action: string;
  x?: CompiledExpression | number;
  y?: CompiledExpression | number;
  w?: CompiledExpression | number;
  h?: CompiledExpression | number;
  x1?: CompiledExpression | number;
  y1?: CompiledExpression | number;
  x2?: CompiledExpression | number;
  y2?: CompiledExpression | number;
}

const pathCache = new Map<string, CachedPath>();

export function generatePathId(shape: ShapeElement, pathIndex: number): string {
  return `${shape.id}_path_${pathIndex}`;
}

export function compilePathDefinition(pathDef: PathDefinition): CompiledPathAction[] {
  return pathDef.actions.map(action => {
    const compiled: CompiledPathAction = { action: action.action };
    
    if ('x' in action && action.x !== undefined) {
      compiled.x = typeof action.x === 'number' ? action.x : compileExpression(action.x) ?? 0;
    }
    if ('y' in action && action.y !== undefined) {
      compiled.y = typeof action.y === 'number' ? action.y : compileExpression(action.y) ?? 0;
    }
    if ('w' in action && action.w !== undefined) {
      compiled.w = typeof action.w === 'number' ? action.w : compileExpression(action.w) ?? 0;
    }
    if ('h' in action && action.h !== undefined) {
      compiled.h = typeof action.h === 'number' ? action.h : compileExpression(action.h) ?? 0;
    }
    if ('x1' in action && action.x1 !== undefined) {
      compiled.x1 = typeof action.x1 === 'number' ? action.x1 : compileExpression(action.x1) ?? 0;
    }
    if ('y1' in action && action.y1 !== undefined) {
      compiled.y1 = typeof action.y1 === 'number' ? action.y1 : compileExpression(action.y1) ?? 0;
    }
    if ('x2' in action && action.x2 !== undefined) {
      compiled.x2 = typeof action.x2 === 'number' ? action.x2 : compileExpression(action.x2) ?? 0;
    }
    if ('y2' in action && action.y2 !== undefined) {
      compiled.y2 = typeof action.y2 === 'number' ? action.y2 : compileExpression(action.y2) ?? 0;
    }
    
    return compiled;
  });
}

export function getOrCompileShapePaths(shape: ShapeElement): CachedPath[] {
  const cachedPaths: CachedPath[] = [];
  
  for (let i = 0; i < shape.path.length; i++) {
    const pathId = generatePathId(shape, i);
    const cached = pathCache.get(pathId);
    
    if (cached && cached.lastModified >= shape.updatedAt) {
      cachedPaths.push(cached);
    } else {
      const pathDef = shape.path[i];
      const compiledActions = compilePathDefinition(pathDef);
      const newCached: CachedPath = {
        pathId,
        compiledActions,
        lastModified: Date.now()
      };
      pathCache.set(pathId, newCached);
      cachedPaths.push(newCached);
    }
  }
  
  return cachedPaths;
}

export function invalidateShapeCache(shapeId: string): void {
  for (const [key, _] of pathCache) {
    if (key.startsWith(`${shapeId}_path_`)) {
      pathCache.delete(key);
    }
  }
}

export function clearPathCache(): void {
  pathCache.clear();
}

export function getPathCacheSize(): number {
  return pathCache.size;
}

import type { ShapeElement, PathDefinition } from '@diagen/core';
import { CompiledPathAction, compilePathActions } from './render-utils'

export interface CachedPath {
  pathId: string;
  compiledActions: CompiledPathAction[];
  lastModified: number;
}

const pathCache = new Map<string, CachedPath>();

export function generatePathId(shape: ShapeElement, pathIndex: number): string {
  return `${shape.id}_path_${pathIndex}`;
}

export function getOrCompileShapePaths(shape: ShapeElement): CachedPath[] {
  const cachedPaths: CachedPath[] = [];
  
  for (let i = 0; i < shape.path.length; i++) {
    const pathId = generatePathId(shape, i);
    const cached = pathCache.get(pathId);
    
    if (cached && cached.lastModified >= (shape as any).updatedAt) {
      cachedPaths.push(cached);
    } else {
      const pathDef = shape.path[i];
      const compiledActions = compilePathActions(pathDef.actions)
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

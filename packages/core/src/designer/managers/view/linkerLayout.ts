import type { Bounds } from '@diagen/shared'
import { batch, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { DEFAULTS } from '../../../constants'
import { isLinker, isShape, type DiagramElement, type LinkerElement, type ShapeElement } from '../../../model'
import {
  calculateLineJumps,
  calculateLinkerRoute,
  type LinkerRoute,
  type LinkerRouteOptions,
} from '../../../utils/router'
import type { LinkerRouteConfig } from '../../types'
import type { ElementManager } from '../element'
import { calculateLinkerBoundsFromRoute } from './shared'

export interface LinkerLayout {
  route: LinkerRoute
  bounds: Bounds
}

interface LinkerLayoutCacheEntry {
  stamp: number
  configKey: string
  route: LinkerRoute
  bounds: Bounds
}

interface CreateLinkerLayoutControllerOptions {
  element: ElementManager
  getRouteConfig: () => LinkerRouteConfig
  getRouteConfigKey: () => string
  isLineJumpsEnabled: () => boolean | undefined
}

export function createLinkerLayoutController(options: CreateLinkerLayoutControllerOptions) {
  const linkerLayoutCache = new Map<string, LinkerLayoutCacheEntry>()
  const [linkerLayoutStampMap, setLinkerLayoutStampMap] = createStore<Record<string, number>>({})
  const [linkerSceneStamp, setLinkerSceneStamp] = createSignal<number>(0)

  function getLayout(linker: LinkerElement): LinkerLayout {
    const baseLayout = getBaseLayout(linker)
    const jumps = resolveRouteJumps(linker, baseLayout.route)

    return {
      route: jumps && jumps.length > 0 ? { ...baseLayout.route, jumps } : baseLayout.route,
      bounds: baseLayout.bounds,
    }
  }

  function getRoute(linker: LinkerElement): LinkerRoute {
    return getLayout(linker).route
  }

  function getBounds(linker: LinkerElement): Bounds {
    return getLayout(linker).bounds
  }

  function markDirty(elements: Array<DiagramElement | null | undefined>): void {
    const dirtyLinkerIds = collectDirtyLinkerIds(elements)
    if (dirtyLinkerIds.size === 0) return

    batch(() => {
      for (const id of dirtyLinkerIds) {
        linkerLayoutCache.delete(id)
        setLinkerLayoutStampMap(id, value => (value ?? 0) + 1)
      }
      bumpSceneStamp()
    })
  }

  function clear(): void {
    linkerLayoutCache.clear()
    setLinkerLayoutStampMap({})
    bumpSceneStamp()
  }

  function removeEntries(elements: Array<DiagramElement | null | undefined>): void {
    let removed = false

    for (const element of elements) {
      if (!element || !isLinker(element)) continue
      linkerLayoutCache.delete(element.id)
      setLinkerLayoutStampMap(element.id, 0)
      removed = true
    }

    if (removed) {
      bumpSceneStamp()
    }
  }

  function getBaseLayout(linker: LinkerElement): LinkerLayout {
    const stamp = linkerLayoutStampMap[linker.id] ?? 0
    const configKey = options.getRouteConfigKey()
    const cached = linkerLayoutCache.get(linker.id)

    if (cached && cached.stamp === stamp && cached.configKey === configKey) {
      return {
        route: cached.route,
        bounds: cached.bounds,
      }
    }

    const route = calculateLinkerRoute(linker, getShapeById, resolveRouteOptions(linker))
    const bounds = calculateLinkerBoundsFromRoute(route)

    linkerLayoutCache.set(linker.id, {
      stamp,
      configKey,
      route,
      bounds,
    })

    return { route, bounds }
  }

  function getShapeById(id: string): ShapeElement | null {
    const element = options.element.getElementById(id)
    return element && isShape(element) ? element : null
  }

  function resolveRouteOptions(linker: LinkerElement): LinkerRouteOptions {
    const routeConfig = options.getRouteConfig()
    const strategy = routeConfig.strategies[linker.linkerType] ?? 'basic'

    if (strategy === 'basic') {
      return { strategy }
    }

    return {
      strategy,
      obstacleElements: options.element.elements(),
      obstacleConfig: routeConfig.obstacleConfig,
      obstacleOptions: routeConfig.obstacleOptions,
    }
  }

  function resolveRouteJumps(linker: LinkerElement, route: LinkerRoute): LinkerRoute['jumps'] {
    if (!options.isLineJumpsEnabled()) return []
    if (options.element.linkers().length > DEFAULTS.DISABLE_LINE_JUMPS_THRESHOLD) return []

    // 依赖全局连线场景版本，确保任意相关布局变化都能刷新跳线。
    linkerSceneStamp()

    const routeConfig = options.getRouteConfig()
    const linkers = options.element.linkers()
    const currentIndex = linkers.findIndex(item => item.id === linker.id)
    if (currentIndex <= 0) return []

    const priorRoutes = linkers.slice(0, currentIndex).map(item => getBaseLayout(item).route)
    return calculateLineJumps(route, priorRoutes, {
      radius: routeConfig.lineJumpRadius,
    })
  }

  function collectDirtyLinkerIds(elements: Array<DiagramElement | null | undefined>): Set<string> {
    const dirtyLinkerIds = new Set<string>()
    let shouldInvalidateObstacleRoutes = false

    for (const element of elements) {
      if (!element) continue

      if (isLinker(element)) {
        dirtyLinkerIds.add(element.id)
        continue
      }

      if (isShape(element)) {
        shouldInvalidateObstacleRoutes = true
        for (const linker of options.element.getRelatedLinkers(element.id)) {
          dirtyLinkerIds.add(linker.id)
        }
      }
    }

    if (shouldInvalidateObstacleRoutes) {
      for (const linker of options.element.linkers()) {
        if (usesSharedObstacleScene(linker)) {
          dirtyLinkerIds.add(linker.id)
        }
      }
    }

    return dirtyLinkerIds
  }

  function usesSharedObstacleScene(linker: LinkerElement): boolean {
    const strategy = options.getRouteConfig().strategies[linker.linkerType] ?? 'basic'
    return strategy === 'obstacle'
  }

  function bumpSceneStamp(): void {
    setLinkerSceneStamp(value => value + 1)
  }

  return {
    getLayout,
    getRoute,
    getBounds,
    markDirty,
    clear,
    removeEntries,
  }
}

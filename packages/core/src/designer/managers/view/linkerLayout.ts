import type { Bounds } from '@diagen/shared'
import { batch, createSignal } from 'solid-js'
import { createStore } from 'solid-js/store'
import { DEFAULTS } from '../../../constants'
import { isLinker, isShape, type DiagramElement, type LinkerElement } from '../../../model'
import {
  calculateLineJumps,
  getLinkerRoute,
  type LinkerRoute,
  type LinkerRouteOptions,
} from '../../../route'
import type { LinkerRouteConfig } from '../../types'
import type { ElementManager } from '../element'
import { calculateLinkerBounds } from './shared'

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
  routeConfig: () => LinkerRouteConfig
  isLineJumpsEnabled: () => boolean | undefined
}

function createMemory<K, V>() {
  const cache = new Map<K, V>()

  const get = (key: K, load: () => V): V => {
    const cached = cache.get(key)
    if (cached !== undefined) return cached

    const next = load()
    cache.set(key, next)
    return next
  }

  const clear = () => {
    cache.clear()
  }

  return {
    get,
    clear,
  }
}

export function createLinkerLayoutController(options: CreateLinkerLayoutControllerOptions) {
  const { element, routeConfig, isLineJumpsEnabled } = options
  const linkerLayoutCache = new Map<string, LinkerLayoutCacheEntry>()
  const routeJumpsMemory = createMemory<string, LinkerRoute['jumps']>()
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
    invalidateLayouts(collectDirtyLinkerIds(elements))
  }

  function clear(): void {
    batch(() => {
      linkerLayoutCache.clear()
      setLinkerLayoutStampMap({})
      bumpSceneStamp()
    })
  }

  function removeEntries(elements: Array<DiagramElement | null | undefined>): void {
    const ids = collectLinkerIds(elements)
    const removedIds = Array.from(ids)
    if (removedIds.length === 0) return

    batch(() => {
      for (const id of removedIds) {
        linkerLayoutCache.delete(id)
      }
      setLinkerLayoutStampMap(current => {
        const next = { ...current }
        for (const id of removedIds) {
          delete next[id]
        }
        return next
      })
      bumpSceneStamp()
    })
  }

  function getBaseLayout(linker: LinkerElement): LinkerLayout {
    const stamp = linkerLayoutStampMap[linker.id] ?? 0
    const configKey = getRouteConfigKey()
    const cached = linkerLayoutCache.get(linker.id)

    if (cached && cached.stamp === stamp && cached.configKey === configKey) {
      return {
        route: cached.route,
        bounds: cached.bounds,
      }
    }

    const route = getLinkerRoute(linker, getElementById, resolveRouteOptions(linker))
    const bounds = calculateLinkerBounds(linker, route)

    linkerLayoutCache.set(linker.id, {
      stamp,
      configKey,
      route,
      bounds,
    })

    return { route, bounds }
  }

  function getRouteConfigKey(): string {
    return JSON.stringify(routeConfig())
  }

  function getElementById(id: string): DiagramElement | null {
    return element.getElementById(id) ?? null
  }

  function resolveRouteOptions(linker: LinkerElement): LinkerRouteOptions {
    const config = routeConfig()
    const strategy = config.strategies[linker.linkerType] ?? 'basic'

    if (strategy === 'basic') {
      return { strategy }
    }

    return {
      strategy,
      obstacleElements: element.elements(),
      obstacleConfig: config.obstacleConfig,
      obstacleOptions: config.obstacleOptions,
    }
  }

  function resolveRouteJumps(linker: LinkerElement, route: LinkerRoute): LinkerRoute['jumps'] {
    if (!isLineJumpsEnabled()) return []
    if (element.linkers().length > DEFAULTS.DISABLE_LINE_JUMPS_THRESHOLD) return []

    // 依赖全局连线场景版本，确保任意相关布局变化都能刷新跳线。
    const sceneStamp = linkerSceneStamp()

    const linkers = element.linkers()
    const currentIndex = linkers.findIndex(item => item.id === linker.id)
    if (currentIndex <= 0) return []

    const radius = routeConfig().lineJumpRadius
    const memoryKey = [linker.id, sceneStamp, currentIndex, radius, getRouteConfigKey()].join(':')

    return routeJumpsMemory.get(memoryKey, () => {
      const priorRoutes = linkers.slice(0, currentIndex).map(item => getBaseLayout(item).route)
      return calculateLineJumps(route, priorRoutes, {
        radius,
      })
    })
  }

  function collectDirtyLinkerIds(elements: Array<DiagramElement | null | undefined>): Set<string> {
    const dirtyLinkerIds = new Set<string>()
    let shouldInvalidateObstacleRoutes = false

    for (const el of elements) {
      if (!el) continue

      if (isLinker(el)) {
        dirtyLinkerIds.add(el.id)
        continue
      }

      if (isShape(el)) {
        shouldInvalidateObstacleRoutes = true
        for (const linker of element.getRelatedLinkers(el.id)) {
          dirtyLinkerIds.add(linker.id)
        }
      }
    }

    if (shouldInvalidateObstacleRoutes) {
      for (const linker of element.linkers()) {
        const strategy = routeConfig().strategies[linker.linkerType] ?? 'basic'
        if (strategy === 'obstacle') {
          dirtyLinkerIds.add(linker.id)
        }
      }
    }

    return dirtyLinkerIds
  }

  function collectLinkerIds(elements: Array<DiagramElement | null | undefined>): string[] {
    const ids: string[] = []

    for (const el of elements) {
      if (!el || !isLinker(el)) continue
      ids.push(el.id)
    }

    return ids
  }

  function invalidateLayouts(ids: Iterable<string>): void {
    const nextIds = Array.from(ids)
    if (nextIds.length === 0) return

    batch(() => {
      for (const id of nextIds) {
        linkerLayoutCache.delete(id)
        setLinkerLayoutStampMap(id, value => (value ?? 0) + 1)
      }
      bumpSceneStamp()
    })
  }

  function bumpSceneStamp(): void {
    routeJumpsMemory.clear()
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

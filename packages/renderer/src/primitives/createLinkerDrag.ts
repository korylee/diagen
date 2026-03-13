import { createSignal, onCleanup } from 'solid-js'
import {
  getShapeAnchorInfo,
  getShapeAnchorInfoById,
  getShapePerimeterInfo,
  isLinker,
  resolveShapePerimeterInfo,
  type LinkerElement,
  type LinkerEndpointBinding,
  type LinkerRoute,
} from '@diagen/core'
import type { Point } from '@diagen/shared'
import { getDistance } from '@diagen/shared'
import { useDesigner } from '../components'
import { hitTestLinker, type LinkerHit } from '../utils'
import { createDragSession, type CreateDragSessionOptions } from './createDragSession'
import { type EventToCanvas } from './createCoordinateService'
import { createPointerDeltaState } from './pointerDeltaState'

export type LinkerDragMode = 'from' | 'to' | 'control' | 'line'

interface DragState {
  linkerId: string
  mode: LinkerDragMode
  controlIndex?: number
  oppositeShapeId: string | null
  startFrom: Point
  startTo: Point
  startControl?: Point
  startRawFrom: LinkerElement['from']
  startRawTo: LinkerElement['to']
  startPoints: Point[]
}

export interface AnchorHit {
  shapeId: string
  binding: LinkerEndpointBinding
  anchorId?: string
  point: Point
  angle: number
}

export interface LinkerDragSnapshot {
  linkerId: string
  mode: LinkerDragMode
  controlIndex?: number
  oppositeShapeId: string | null
}

export interface CreateLinkerDragOptions extends CreateDragSessionOptions {
  eventToCanvas?: EventToCanvas
  endpointTolerance?: number
  lineTolerance?: number
  controlTolerance?: number
  segmentTolerance?: number
  snapDistance?: number
  snapOnMove?: boolean
  snapStickDistance?: number
  directionBias?: number
  allowSelfConnect?: boolean
}

function normalizeAngleDiff(a: number, b: number): number {
  let diff = Math.abs(a - b)
  while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2)
  return diff
}

export function createLinkerDrag(options: CreateLinkerDragOptions = {}) {
  const {
    threshold = 3,
    eventToCanvas,
    endpointTolerance = 10,
    lineTolerance = 8,
    controlTolerance = 8,
    segmentTolerance = 8,
    snapDistance = 12,
    snapOnMove = true,
    snapStickDistance = 8,
    directionBias = 0.35,
    allowSelfConnect = true,
  } = options

  const designer = useDesigner()
  const { edit, view, element, history } = designer
  const session = createDragSession({ threshold })
  const transaction = history.transaction.createScope('拖拽连线')
  const pointerDelta = createPointerDeltaState({ eventToCanvas })

  const [dragState, setDragState] = createSignal<DragState | null>(null)
  const [candidateAnchor, setCandidateAnchor] = createSignal<AnchorHit | null>(null)

  function isShapeLinkable(shapeId: string, state?: DragState): boolean {
    const shape = designer.element.getById(shapeId)
    if (!shape || shape.type !== 'shape') return false
    if (!shape.visible || shape.locked) return false
    if (shape.attribute?.visible === false || shape.attribute?.linkable === false) return false
    if (!allowSelfConnect && state?.oppositeShapeId && shape.id === state.oppositeShapeId) return false
    return true
  }

  function resolveAnchorHit(shapeId: string, hit: AnchorHit): AnchorHit | null {
    const target = designer.element.getById(shapeId)
    if (!target || target.type !== 'shape') return null
    if (hit.binding.type === 'fixed') {
      const info = getShapeAnchorInfoById(target, hit.binding.anchorId)
      if (!info) return null
      return {
        shapeId: target.id,
        binding: { type: 'fixed', anchorId: info.id },
        anchorId: info.id,
        point: info.point,
        angle: info.angle,
      }
    }
    if (hit.binding.type === 'perimeter') {
      const info = resolveShapePerimeterInfo(target, hit.binding)
      if (!info) return null
      return {
        shapeId: target.id,
        binding: {
          type: 'perimeter',
          pathIndex: info.pathIndex,
          segmentIndex: info.segmentIndex,
          t: info.t,
        },
        point: info.point,
        angle: info.angle,
      }
    }

    return null
  }

  function getHitWithRoute(linker: LinkerElement, point: Point): { hit: LinkerHit | null; route: LinkerRoute } {
    const route = view.getLinkerRoute(linker)
    const hit = hitTestLinker(linker, route, point, {
      zoom: view.viewport().zoom,
      endpointTolerance,
      controlTolerance,
      lineTolerance,
      segmentTolerance,
    })
    return { hit, route }
  }

  function hitTest(linkerId: string, point: Point): LinkerHit | null {
    return hitTestWithRoute(linkerId, point)?.hit ?? null
  }

  function hitTestWithRoute(linkerId: string, point: Point): { hit: LinkerHit; route: LinkerRoute } | null {
    const el = element.getById(linkerId)
    if (!el || !isLinker(el)) return null
    const result = getHitWithRoute(el, point)
    if (!result.hit) return null
    return {
      hit: result.hit,
      route: result.route,
    }
  }

  function start(
    e: MouseEvent,
    linkerId: string,
    point: Point,
    presetHit?: LinkerHit,
    presetRoute?: LinkerRoute,
  ): boolean {
    const el = element.getById(linkerId)
    if (!el || !isLinker(el)) return false

    const fallback = presetHit ? null : getHitWithRoute(el, point)
    const hit = presetHit ?? fallback?.hit
    if (!hit) return false

    const route = presetRoute ?? fallback?.route ?? view.getLinkerRoute(el)
    let mode: LinkerDragMode = 'line'
    let controlIndex = hit.controlIndex
    let startControl: Point | undefined
    let startPoints = el.points.map(p => ({ x: p.x, y: p.y }))

    if (hit.type === 'from' || hit.type === 'to') {
      mode = hit.type
    } else if (hit.type === 'control') {
      mode = 'control'
      startControl = controlIndex !== undefined ? el.points[controlIndex] : undefined
    } else if (hit.type === 'segment') {
      mode = 'control'
      const insertionIndex =
        startPoints.length === 0 ? 0 : Math.max(0, Math.min(startPoints.length, hit.segmentIndex ?? startPoints.length))
      const insertedPoint = { x: point.x, y: point.y }
      startPoints = [...startPoints]
      startPoints.splice(insertionIndex, 0, insertedPoint)
      controlIndex = insertionIndex
      startControl = insertedPoint
    }

    const state: DragState = {
      linkerId,
      mode,
      controlIndex,
      oppositeShapeId: mode === 'from' ? (el.to.id ?? null) : mode === 'to' ? (el.from.id ?? null) : null,
      startFrom: route.points[0],
      startTo: route.points[route.points.length - 1],
      startControl,
      startRawFrom: { ...el.from },
      startRawTo: { ...el.to },
      startPoints,
    }

    if (!transaction.begin()) return false
    if (hit.type === 'segment') {
      edit.update(linkerId, { points: startPoints })
    }

    setCandidateAnchor(null)
    setDragState(state)
    pointerDelta.setStartFromEvent(e)
    session.begin({ x: e.clientX, y: e.clientY })
    return true
  }

  function move(e: MouseEvent): void {
    const moveState = session.update({ x: e.clientX, y: e.clientY })
    const state = dragState()
    if (!moveState || !moveState.shouldUpdate || !state) return

    const zoom = view.viewport().zoom
    const delta = pointerDelta.resolveDelta({
      moveState,
      zoom,
      event: e,
    })

    const linkerElement = designer.element.getById(state.linkerId)
    if (!linkerElement || !isLinker(linkerElement)) {
      cancel()
      return
    }

    if (state.mode === 'line') {
      moveLine(state, delta)
      return
    }

    if (state.mode === 'control' && state.controlIndex !== undefined && state.startControl) {
      moveControl(state, delta, linkerElement, state.controlIndex, state.startControl)
      return
    }

    moveEndpoint(state, delta, zoom, linkerElement)
  }

  function moveLine(state: DragState, delta: Point): void {
    setCandidateAnchor(null)
    edit.update(state.linkerId, {
      from: {
        ...state.startRawFrom,
        id: null,
        binding: { type: 'free' },
        x: state.startFrom.x + delta.x,
        y: state.startFrom.y + delta.y,
      },
      to: {
        ...state.startRawTo,
        id: null,
        binding: { type: 'free' },
        x: state.startTo.x + delta.x,
        y: state.startTo.y + delta.y,
      },
      points: state.startPoints.map(p => ({ x: p.x + delta.x, y: p.y + delta.y })),
    })
    scheduleLinkerAutoGrow(state.linkerId)
  }

  function moveControl(
    state: DragState,
    delta: Point,
    linkerElement: LinkerElement,
    controlIndex: number,
    startControl: Point,
  ): void {
    setCandidateAnchor(null)
    const nextPoints = linkerElement.points.slice()
    nextPoints[controlIndex] = {
      x: startControl.x + delta.x,
      y: startControl.y + delta.y,
    }
    edit.update(state.linkerId, { points: nextPoints })
    scheduleLinkerAutoGrow(state.linkerId)
  }

  function moveEndpoint(state: DragState, delta: Point, zoom: number, linkerElement: LinkerElement): void {
    const startPoint = state.mode === 'from' ? state.startFrom : state.startTo
    const target = {
      x: startPoint.x + delta.x,
      y: startPoint.y + delta.y,
    }
    const maxDistance = snapDistance / zoom
    const stickDistance = snapStickDistance / zoom
    const oppositePoint = state.mode === 'from' ? linkerElement.to : linkerElement.from
    const snappedAnchor = findNearestAnchor(target, {
      maxDistance,
      stickDistance,
      state,
      preferred: candidateAnchor(),
      oppositePoint,
    })
    setCandidateAnchor(snappedAnchor)

    const freeAngle = Math.atan2(oppositePoint.y - target.y, oppositePoint.x - target.x)

    if (state.mode === 'from') {
      edit.update(state.linkerId, {
        from: {
          ...linkerElement.from,
          id: snapOnMove && snappedAnchor ? snappedAnchor.shapeId : null,
          binding: snapOnMove && snappedAnchor ? snappedAnchor.binding : { type: 'free' },
          angle: snapOnMove && snappedAnchor ? snappedAnchor.angle : freeAngle,
          x: snapOnMove && snappedAnchor ? snappedAnchor.point.x : target.x,
          y: snapOnMove && snappedAnchor ? snappedAnchor.point.y : target.y,
        },
      })
    } else {
      edit.update(state.linkerId, {
        to: {
          ...linkerElement.to,
          id: snapOnMove && snappedAnchor ? snappedAnchor.shapeId : null,
          binding: snapOnMove && snappedAnchor ? snappedAnchor.binding : { type: 'free' },
          angle: snapOnMove && snappedAnchor ? snappedAnchor.angle : freeAngle,
          x: snapOnMove && snappedAnchor ? snappedAnchor.point.x : target.x,
          y: snapOnMove && snappedAnchor ? snappedAnchor.point.y : target.y,
        },
      })
    }
    scheduleLinkerAutoGrow(state.linkerId)
  }

  function end(): void {
    if (!session.isPending()) return

    const state = dragState()
    const shouldCommit = session.finish()

    if (shouldCommit && state && (state.mode === 'from' || state.mode === 'to')) {
      snapEndpoint(state)
      scheduleLinkerAutoGrow(state.linkerId)
      designer.view.flushAutoGrow()
      transaction.commit()
    } else if (shouldCommit) {
      designer.view.flushAutoGrow()
      transaction.commit()
    } else {
      transaction.abort()
    }

    setCandidateAnchor(null)
    setDragState(null)
    pointerDelta.clear()
  }

  function cancel(): void {
    if (!session.isPending()) return
    transaction.abort()
    session.cancel()
    setCandidateAnchor(null)
    setDragState(null)
    pointerDelta.clear()
  }

  function snapEndpoint(state: DragState): void {
    const element = designer.element.getById(state.linkerId)
    if (!element || !isLinker(element)) return

    const currentPoint =
      state.mode === 'from' ? { x: element.from.x, y: element.from.y } : { x: element.to.x, y: element.to.y }
    const zoom = view.viewport().zoom
    const maxDistance = snapDistance / zoom
    const stickDistance = snapStickDistance / zoom
    const oppositePoint = state.mode === 'from' ? element.to : element.from
    const target =
      candidateAnchor() ??
      findNearestAnchor(currentPoint, {
        maxDistance,
        stickDistance,
        state,
        oppositePoint,
      })
    if (!target) return

    if (state.mode === 'from') {
      edit.update(state.linkerId, {
        from: {
          ...element.from,
          id: target.shapeId,
          binding: target.binding,
          angle: target.angle,
          x: target.point.x,
          y: target.point.y,
        },
      })
    } else {
      edit.update(state.linkerId, {
        to: {
          ...element.to,
          id: target.shapeId,
          binding: target.binding,
          angle: target.angle,
          x: target.point.x,
          y: target.point.y,
        },
      })
    }
  }

  function scheduleLinkerAutoGrow(linkerId: string): void {
    const linker = designer.element.getById(linkerId)
    if (!linker || !isLinker(linker)) return
    designer.view.scheduleAutoGrow(view.getLinkerBounds(linker))
  }

  function findNearestAnchor(
    point: Point,
    options: {
      maxDistance: number
      stickDistance: number
      state?: DragState
      preferred?: AnchorHit | null
      oppositePoint?: Point
    },
  ): AnchorHit | null {
    const { maxDistance, stickDistance, state, preferred, oppositePoint } = options

    if (preferred && isShapeLinkable(preferred.shapeId, state)) {
      const resolved = resolveAnchorHit(preferred.shapeId, preferred)
      if (resolved && getDistance(point, resolved.point) <= maxDistance + stickDistance) {
        return resolved
      }
    }

    let best: AnchorHit | null = null
    let bestScore = Infinity
    const weight = Math.max(0, directionBias)

    for (const shape of designer.element.shapes()) {
      if (!isShapeLinkable(shape.id, state)) continue

      for (let i = 0; i < shape.anchors.length; i++) {
        const info = getShapeAnchorInfo(shape, i)
        if (!info) continue

        const distance = getDistance(point, info.point)
        if (distance > maxDistance) continue

        let score = distance
        if (oppositePoint && weight > 0) {
          const desiredAngle = Math.atan2(oppositePoint.y - info.point.y, oppositePoint.x - info.point.x)
          const diff = normalizeAngleDiff(desiredAngle, info.angle)
          // 角度差越大惩罚越高，避免临近锚点间频繁抖动。
          score += (diff / Math.PI) * weight * maxDistance
        }

        if (score <= bestScore) {
          bestScore = score
          best = {
            shapeId: shape.id,
            binding: { type: 'fixed', anchorId: info.id },
            anchorId: info.id,
            point: info.point,
            angle: info.angle,
          }
        }
      }

      const perimeter = getShapePerimeterInfo(shape, point)
      if (!perimeter || perimeter.distance > maxDistance) continue

      let score = perimeter.distance
      if (oppositePoint && weight > 0) {
        const desiredAngle = Math.atan2(oppositePoint.y - perimeter.point.y, oppositePoint.x - perimeter.point.x)
        const diff = normalizeAngleDiff(desiredAngle, perimeter.angle)
        score += (diff / Math.PI) * weight * maxDistance
      }

      if (score <= bestScore) {
        bestScore = score
        best = {
          shapeId: shape.id,
          binding: {
            type: 'perimeter',
            pathIndex: perimeter.pathIndex,
            segmentIndex: perimeter.segmentIndex,
            t: perimeter.t,
          },
          point: perimeter.point,
          angle: perimeter.angle,
        }
      }
    }

    return best
  }

  function getDragSnapshot(): LinkerDragSnapshot | null {
    const state = dragState()
    if (!state) return null

    return {
      linkerId: state.linkerId,
      mode: state.mode,
      controlIndex: state.controlIndex,
      oppositeShapeId: state.oppositeShapeId,
    }
  }

  function isShapeLinkableByCurrentState(shapeId: string): boolean {
    return isShapeLinkable(shapeId, dragState() ?? undefined)
  }

  onCleanup(() => {
    if (session.isPending()) cancel()
  })

  return {
    isPending: session.isPending,
    isDragging: session.isDragging,
    dragSnapshot: getDragSnapshot,
    isShapeLinkable: isShapeLinkableByCurrentState,
    candidateAnchor,
    hitTestWithRoute,
    hitTest,
    start,
    move,
    end,
    cancel,
  }
}

export type CreateLinkerDrag = ReturnType<typeof createLinkerDrag>

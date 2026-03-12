import { createSignal, onCleanup } from 'solid-js'
import { getShapeAnchors, isLinker, type LinkerElement, type LinkerRoute } from '@diagen/core'
import type { Point } from '@diagen/shared'
import { getDistance } from '@diagen/shared'
import { useDesigner } from '../components'
import { hitTestLinker, type LinkerHit } from '../utils'
import { createDragSession, type CreateDragSessionOptions } from './createDragSession'
import { resolveCanvasDelta, type EventToCanvas } from './resolveCanvasDelta'

type LinkerDragMode = 'from' | 'to' | 'control' | 'line'

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
  startPointerCanvas: Point | null
}

export interface AnchorHit {
  shapeId: string
  anchorIndex: number
  point: Point
}

export interface CreateLinkerDragOptions extends CreateDragSessionOptions {
  eventToCanvas?: EventToCanvas
  endpointTolerance?: number
  lineTolerance?: number
  controlTolerance?: number
  segmentTolerance?: number
  snapDistance?: number
  snapOnMove?: boolean
  allowSelfConnect?: boolean
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
    allowSelfConnect = true,
  } = options

  const designer = useDesigner()
  const { edit, view, element } = designer
  const session = createDragSession({ threshold })
  const transaction = designer.history.transaction.createScope('拖拽连线')

  const [dragState, setDragState] = createSignal<DragState | null>(null)
  const [candidateAnchor, setCandidateAnchor] = createSignal<AnchorHit | null>(null)

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
        startPoints.length === 0
          ? 0
          : Math.max(0, Math.min(startPoints.length, hit.segmentIndex ?? startPoints.length))
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
      oppositeShapeId:
        mode === 'from'
          ? (el.to.id ?? null)
          : mode === 'to'
            ? (el.from.id ?? null)
            : null,
      startFrom: route.points[0],
      startTo: route.points[route.points.length - 1],
      startControl,
      startRawFrom: { ...el.from },
      startRawTo: { ...el.to },
      startPoints,
      startPointerCanvas: eventToCanvas ? eventToCanvas(e) : null,
    }

    if (!transaction.begin()) return false
    if (hit.type === 'segment') {
      edit.update(linkerId, { points: startPoints })
    }

    setCandidateAnchor(null)
    setDragState(state)
    session.begin({ x: e.clientX, y: e.clientY })
    return true
  }

  function move(e: MouseEvent): void {
    const moveState = session.update({ x: e.clientX, y: e.clientY })
    const state = dragState()
    if (!moveState || !moveState.shouldUpdate || !state) return

    const zoom = view.viewport().zoom
    const delta = resolveCanvasDelta({
      moveState,
      zoom,
      startPointerCanvas: state.startPointerCanvas,
      event: e,
      eventToCanvas,
    })

    const linkerElement = designer.element.getById(state.linkerId)
    if (!linkerElement || !isLinker(linkerElement)) {
      cancel()
      return
    }

    if (state.mode === 'line') {
      setCandidateAnchor(null)
      edit.update(state.linkerId, {
        from: {
          ...state.startRawFrom,
          id: null,
          anchorIndex: undefined,
          x: state.startFrom.x + delta.x,
          y: state.startFrom.y + delta.y,
        },
        to: {
          ...state.startRawTo,
          id: null,
          anchorIndex: undefined,
          x: state.startTo.x + delta.x,
          y: state.startTo.y + delta.y,
        },
        points: state.startPoints.map(p => ({ x: p.x + delta.x, y: p.y + delta.y })),
      })
      scheduleLinkerAutoGrow(state.linkerId)
      return
    }

    if (state.mode === 'control' && state.controlIndex !== undefined && state.startControl) {
      setCandidateAnchor(null)
      const nextPoints = linkerElement.points.slice()
      nextPoints[state.controlIndex] = {
        x: state.startControl.x + delta.x,
        y: state.startControl.y + delta.y,
      }
      edit.update(state.linkerId, { points: nextPoints })
      scheduleLinkerAutoGrow(state.linkerId)
      return
    }

    const startPoint = state.mode === 'from' ? state.startFrom : state.startTo
    const target = {
      x: startPoint.x + delta.x,
      y: startPoint.y + delta.y,
    }
    const maxDistance = snapDistance / zoom
    const snappedAnchor = findNearestAnchor(target, maxDistance, state)
    setCandidateAnchor(snappedAnchor)

    if (state.mode === 'from') {
      edit.update(state.linkerId, {
        from: {
          ...linkerElement.from,
          id: snapOnMove && snappedAnchor ? snappedAnchor.shapeId : null,
          anchorIndex: snapOnMove && snappedAnchor ? snappedAnchor.anchorIndex : undefined,
          x: snapOnMove && snappedAnchor ? snappedAnchor.point.x : target.x,
          y: snapOnMove && snappedAnchor ? snappedAnchor.point.y : target.y,
        },
      })
    } else {
      edit.update(state.linkerId, {
        to: {
          ...linkerElement.to,
          id: snapOnMove && snappedAnchor ? snappedAnchor.shapeId : null,
          anchorIndex: snapOnMove && snappedAnchor ? snappedAnchor.anchorIndex : undefined,
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
  }

  function cancel(): void {
    if (!session.isPending()) return
    transaction.abort()
    session.cancel()
    setCandidateAnchor(null)
    setDragState(null)
  }

  function snapEndpoint(state: DragState): void {
    const element = designer.element.getById(state.linkerId)
    if (!element || !isLinker(element)) return

    const currentPoint =
      state.mode === 'from' ? { x: element.from.x, y: element.from.y } : { x: element.to.x, y: element.to.y }
    const maxDistance = snapDistance / view.viewport().zoom
    const target =
      candidateAnchor() ??
      findNearestAnchor(currentPoint, maxDistance, state)
    if (!target) return

    if (state.mode === 'from') {
      edit.update(state.linkerId, {
        from: {
          ...element.from,
          id: target.shapeId,
          anchorIndex: target.anchorIndex,
          x: target.point.x,
          y: target.point.y,
        },
      })
    } else {
      edit.update(state.linkerId, {
        to: {
          ...element.to,
          id: target.shapeId,
          anchorIndex: target.anchorIndex,
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

  function findNearestAnchor(point: Point, maxDistance: number, state?: DragState): AnchorHit | null {
    let best: AnchorHit | null = null
    let bestDistance = maxDistance

    for (const shape of designer.element.shapes()) {
      if (!shape.visible || shape.locked) continue
      if (shape.attribute?.visible === false || shape.attribute?.linkable === false) continue
      if (!allowSelfConnect && state?.oppositeShapeId && shape.id === state.oppositeShapeId) continue

      const anchors = getShapeAnchors(shape)
      for (let i = 0; i < anchors.length; i++) {
        const d = getDistance(point, anchors[i])
        if (d <= bestDistance) {
          bestDistance = d
          best = {
            shapeId: shape.id,
            anchorIndex: i,
            point: anchors[i],
          }
        }
      }
    }

    return best
  }

  onCleanup(() => {
    if (session.isPending()) cancel()
  })

  return {
    isPending: session.isPending,
    isDragging: session.isDragging,
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

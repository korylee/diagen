import {
  isLinker,
  isShape,
  type LinkerElement,
  type LinkerEndpoint,
  type LinkerRoute,
  type ShapeElement,
} from '@diagen/core'
import { getAnchorInfo, getEdgeInfo, resolveCreateAnchor, resolveEdgeInfo } from '@diagen/core/anchors'
import type { Point } from '@diagen/shared'
import { getDistance, isSameNumber, pick } from '@diagen/shared'
import { createSignal, onCleanup } from 'solid-js'
import { useDesigner } from '../../../context'
import { hitTestLinkerGeometry, type LinkerHit } from '../../../utils'
import {
  areSamePoints,
  normalizeLinkerManualPoints,
  removeWaypointAt,
  supportsManualWaypoints,
} from '../../linker/normalizeManualPoints'
import type { CoordinateService } from '../../services/createCoordinateService'
import { createDragSession } from '../shared/createDragSession'
import { createPointerDeltaState } from '../shared/createPointerDeltaState'
import type { CreatePointerDragTrackerOptions } from '../shared/createPointerDragTracker'
import { isBoundLinkerEndpoint, LinkerTextPosition, type BoundLinkerEndpoint } from '@diagen/core/model'

export type LinkerDragMode = 'from' | 'to' | 'control' | 'line' | 'text'
type LinkerEndpointMode = Extract<LinkerDragMode, 'from' | 'to'>
type LinkerSnapMode = 'auto' | 'anchor' | 'edge'

interface DragState {
  linkerId: string
  mode: LinkerDragMode
  controlIndex?: number
  controlIndices?: number[]
  orthogonalMoveAxis?: Axis
  oppositeShapeId: string | null
  startFrom: Point
  startTo: Point
  startControl?: Point
  startRawFrom: LinkerElement['from']
  startRawTo: LinkerElement['to']
  startPoints: Point[]
  startTextPosition: LinkerTextPosition
  snapMode: LinkerSnapMode
}

interface CreateContext {
  linkerId: string
}

interface LinkerDragStartInput {
  event: MouseEvent
  state: DragState
  context?: CreateContext
  createContext?: CreateContext | null
  prepare?: () => void
}

interface LinkerEditStateOptions {
  linker: LinkerElement
  point: Point
  hit: LinkerHit
  route: LinkerRoute
}

interface LinkerEditStateResult {
  state: DragState
  shouldInsertSegmentWaypoint: boolean
}

interface SegmentDragState {
  controlIndex: number
  controlIndices?: number[]
  orthogonalMoveAxis?: Axis
  startControl: Point
  startPoints: Point[]
}

export interface LinkerDragSnapshot {
  linkerId: string
  mode: LinkerDragMode
  controlIndex?: number
  oppositeShapeId: string | null
}

export interface BeginLinkerEditOptions {
  linkerId: string
  point: Point
  hit?: LinkerHit
  route?: LinkerRoute
}

export type LinkerCreateSource =
  | {
      type: 'point'
      point: Point
    }
  | {
      type: 'shape'
      shapeId: string
    }

export interface BeginLinkerCreateOptions {
  linkerId: string
  from: LinkerCreateSource
}

export interface CreateLinkerDragOptions extends CreatePointerDragTrackerOptions {
  endpointTolerance?: number
  lineTolerance?: number
  controlTolerance?: number
  segmentTolerance?: number
  snapDistance?: number
  snapOnMove?: boolean
  snapStickDistance?: number
  directionBias?: number
  anchorBias?: number
  edgePenalty?: number
  allowSelfConnect?: boolean
}

interface AnchorCandidate {
  id: string
  point: Point
  angle: number
}

interface SnapShapeCandidate {
  shape: ShapeElement
  anchorCandidates: AnchorCandidate[]
}

interface SnapCandidateCollection {
  list: SnapShapeCandidate[]
  byId: Map<string, SnapShapeCandidate>
}

type Axis = 'x' | 'y'
type OrthogonalBinding =
  | {
      type: 'control'
      index: number
      point: Point
    }
  | {
      type: 'endpoint'
      point: Point
    }

function isEndpointMode(mode: LinkerDragMode): mode is LinkerEndpointMode {
  return mode === 'from' || mode === 'to'
}

function createEmptySnapCandidates(): SnapCandidateCollection {
  return {
    list: [],
    byId: new Map(),
  }
}

function resolveSnapMode(event: Pick<MouseEvent, 'altKey' | 'shiftKey'>): LinkerSnapMode {
  if (event.altKey) return 'anchor'
  if (event.shiftKey) return 'edge'
  return 'auto'
}

function isSnapTargetAllowed(target: BoundLinkerEndpoint, snapMode: LinkerSnapMode): boolean {
  if (snapMode === 'auto') return true
  return snapMode === target.binding.type
}

interface OrthogonalSegmentDragState {
  points: Point[]
  controlIndex: number
  controlIndices: number[]
  moveAxis: Axis
}

function normalizeAngleDiff(a: number, b: number): number {
  let diff = Math.abs(a - b)
  while (diff > Math.PI) diff = Math.abs(diff - Math.PI * 2)
  return diff
}

function resolveOrthogonalAxis(from: Point, to: Point): Axis | null {
  if (isSameNumber(from.x, to.x)) return 'x'
  if (isSameNumber(from.y, to.y)) return 'y'
  return null
}

export function createLinkerDrag(
  coordinate: Pick<CoordinateService, 'eventToCanvas'>,
  options: CreateLinkerDragOptions = {},
) {
  const {
    threshold = 3,
    endpointTolerance = 10,
    lineTolerance = 8,
    controlTolerance = 8,
    segmentTolerance = 8,
    snapDistance = 12,
    snapOnMove = true,
    snapStickDistance = 8,
    directionBias = 0.35,
    anchorBias = 0.18,
    edgePenalty = 0.12,
    allowSelfConnect = true,
  } = options

  const { edit, view, element, history, selection } = useDesigner()
  const transaction = history.createScope('拖拽连线')
  const pointerDelta = createPointerDeltaState(coordinate)

  const [snapTarget, setSnapTarget] = createSignal<BoundLinkerEndpoint | null>(null)
  const [createContext, setCreateContext] = createSignal<CreateContext | null>(null)
  let snapCandidates: SnapCandidateCollection = createEmptySnapCandidates()
  const session = createDragSession<LinkerDragStartInput, DragState>({
    threshold,
    transaction,
    transactionMode: 'on-begin',
    setup: input => {
      input.prepare?.()
      setCreateContext(input.createContext ?? null)
      snapCandidates = buildSnapCandidates(input.state)
      input.state.snapMode = resolveSnapMode(input.event)
      setSnapTarget(resolveInitialSnapTarget(input.state))
      pointerDelta.begin(input.event)
      return input.state
    },
    update: ({ state, event, moveState }) => {
      const zoom = view.transform().zoom
      const delta = pointerDelta.resolveDelta({
        moveState,
        zoom,
        event,
      })

      const linker = element.getElementById(state.linkerId)
      if (!linker || !isLinker(linker)) {
        session.cancel()
        return
      }

      if (state.mode === 'line') {
        moveLine(state, delta)
        return
      }

      if (state.mode === 'text') {
        moveText(state, delta, linker)
        return
      }

      if (state.mode === 'control' && state.controlIndex !== undefined && state.startControl) {
        moveControl(state, delta, linker, state.controlIndex, state.startControl)
        return
      }

      if (isEndpointMode(state.mode)) {
        moveEndpoint(state, delta, zoom, linker, event)
      }
    },
    finalize: ({ state, shouldCommit }) => {
      if (!shouldCommit || !state) return
      if (state.mode === 'control') {
        normalizeWaypoints(state.linkerId)
        return
      }
      if (state.mode === 'text') return
      if (!isEndpointMode(state.mode)) return

      snapEndpoint(state, state.mode)
    },
    reset: () => {
      setSnapTarget(null)
      setCreateContext(null)
      snapCandidates = createEmptySnapCandidates()
      pointerDelta.reset()
    },
    onCommit: () => {
      const currentCreateContext = createContext()
      if (currentCreateContext) {
        selection.replace([currentCreateContext.linkerId])
      }
    },
  })

  function isShapeLinkable(shape: string | ShapeElement, state?: DragState): boolean {
    const shapeElement = typeof shape === 'string' ? element.getElementById(shape) : shape
    if (!shapeElement || !isShape(shapeElement)) return false
    if (!shapeElement.visible || shapeElement.locked) return false
    if (shapeElement.attribute?.visible === false || shapeElement.attribute?.linkable === false) return false
    if (!allowSelfConnect && state?.oppositeShapeId && shapeElement.id === state.oppositeShapeId) return false
    return true
  }

  function buildSnapCandidates(state?: DragState): SnapCandidateCollection {
    const list: SnapShapeCandidate[] = []
    const byId = new Map<string, SnapShapeCandidate>()

    for (const shape of element.shapes()) {
      if (!isShapeLinkable(shape, state)) continue

      const anchorCandidates: AnchorCandidate[] = []
      for (let index = 0; index < shape.anchors.length; index++) {
        const info = getAnchorInfo(shape, index)
        if (!info) continue
        anchorCandidates.push({
          id: info.id,
          point: info.point,
          angle: info.angle,
        })
      }

      const candidate: SnapShapeCandidate = {
        shape,
        anchorCandidates,
      }
      list.push(candidate)
      byId.set(shape.id, candidate)
    }

    return {
      list,
      byId,
    }
  }

  function resolveInitialSnapTarget(state: DragState): BoundLinkerEndpoint | null {
    if (!isEndpointMode(state.mode)) return null

    const endpoint = state.mode === 'from' ? state.startRawFrom : state.startRawTo
    if (!isBoundLinkerEndpoint(endpoint)) return null

    const target = element.getElementById(endpoint.target)
    const shape = isShape(target) ? target : null
    if (!shape) return null

    return resolveBoundEndpoint(endpoint)
  }

  function resolveBoundEndpoint(endpoint: BoundLinkerEndpoint): BoundLinkerEndpoint | null {
    const { binding, target } = endpoint
    const candidate = snapCandidates.byId.get(target)
    if (!candidate) return null
    const { shape } = candidate

    if (binding.type === 'anchor') {
      const info = candidate.anchorCandidates.find(anchor => anchor.id === binding.anchorId)
      if (!info) return null
      return {
        x: info.point.x,
        y: info.point.y,
        angle: info.angle,
        target: shape.id,
        binding: {
          type: 'anchor',
          anchorId: info.id,
        },
      }
    }

    const info = resolveEdgeInfo(shape, binding)
    if (!info) return null
    return {
      x: info.point.x,
      y: info.point.y,
      angle: info.angle,
      target: shape.id,
      binding: {
        type: 'edge',
        pathIndex: info.pathIndex,
        segmentIndex: info.segmentIndex,
        t: info.t,
      },
    }
  }

  function resolveLinkerHit(linker: LinkerElement, point: Point): { hit: LinkerHit | null; route: LinkerRoute } {
    const route = view.getLinkerRoute(linker)
    const hit = hitTestLinkerGeometry(linker, route, point, {
      zoom: view.transform().zoom,
      endpointTolerance,
      controlTolerance,
      lineTolerance,
      segmentTolerance,
    })
    return { hit, route }
  }

  function hitTest(linkerId: string, point: Point): LinkerHit | null {
    return resolveHitResult(linkerId, point)?.hit ?? null
  }

  function resolveHitResult(linkerId: string, point: Point): { hit: LinkerHit; route: LinkerRoute } | null {
    const el = element.getElementById(linkerId)
    if (!el || !isLinker(el)) return null
    const result = resolveLinkerHit(el, point)
    if (!result.hit) return null
    return {
      hit: result.hit,
      route: result.route,
    }
  }

  function resolveSegmentDragState(
    linker: LinkerElement,
    route: LinkerRoute,
    point: Point,
    segmentIndex: number,
  ): SegmentDragState {
    const startPoints = linker.points.map(p => ({ ...p }))
    const orthogonalState =
      linker.linkerType === 'orthogonal' ? resolveOrthogonalSegmentDragState(route, segmentIndex) : null

    if (orthogonalState) {
      return {
        controlIndex: orthogonalState.controlIndex,
        controlIndices: orthogonalState.controlIndices,
        orthogonalMoveAxis: orthogonalState.moveAxis,
        startControl: orthogonalState.points[orthogonalState.controlIndex],
        startPoints: orthogonalState.points,
      }
    }

    const insertionIndex =
      startPoints.length === 0 ? 0 : Math.max(0, Math.min(startPoints.length, segmentIndex ?? startPoints.length))
    const insertedPoint = { ...point }
    const nextPoints = [...startPoints]
    nextPoints.splice(insertionIndex, 0, insertedPoint)

    return {
      controlIndex: insertionIndex,
      startControl: insertedPoint,
      startPoints: nextPoints,
    }
  }

  function resolveBeginEditState(options: LinkerEditStateOptions): LinkerEditStateResult {
    const { linker, point, hit, route } = options
    let mode: LinkerDragMode = 'line'
    let controlIndex: number = (hit as any).controlIndex
    let controlIndices: number[] | undefined
    let orthogonalMoveAxis: Axis | undefined
    let startControl: Point | undefined
    let startPoints = linker.points.map(p => ({ ...p }))

    if (hit.type === 'from' || hit.type === 'to') {
      mode = hit.type
    } else if (hit.type === 'text') {
      mode = 'text'
    } else if (hit.type === 'control') {
      mode = 'control'
      startControl = controlIndex !== undefined ? linker.points[controlIndex] : undefined
    } else if (hit.type === 'segment') {
      mode = 'control'
      const segmentState = resolveSegmentDragState(linker, route, point, hit.segmentIndex ?? 0)
      controlIndex = segmentState.controlIndex
      controlIndices = segmentState.controlIndices
      orthogonalMoveAxis = segmentState.orthogonalMoveAxis
      startControl = segmentState.startControl
      startPoints = segmentState.startPoints
    }

    return {
      state: {
        linkerId: linker.id,
        mode,
        controlIndex,
        controlIndices,
        orthogonalMoveAxis,
        oppositeShapeId: resolveOppositeShapeId(linker, mode),
        startFrom: route.points[0],
        startTo: route.points[route.points.length - 1],
        startControl,
        startRawFrom: { ...linker.from },
        startRawTo: { ...linker.to },
        startPoints,
        startTextPosition: {
          dx: linker.textPosition?.dx ?? 0,
          dy: linker.textPosition?.dy ?? 0,
        },
        snapMode: 'auto',
      },
      shouldInsertSegmentWaypoint: hit.type === 'segment',
    }
  }

  function resolveOppositeShapeId(linker: LinkerElement, mode: LinkerDragMode): string | null {
    const endpoint = mode === 'from' ? linker.to : linker.from
    if (!isBoundLinkerEndpoint(endpoint)) return null

    const target = element.getElementById(endpoint.target)
    return isShape(target) ? endpoint.target : null
  }

  function beginEdit(e: MouseEvent, options: BeginLinkerEditOptions): boolean {
    const { linkerId, point, hit: presetHit, route: presetRoute } = options
    const el = element.getElementById(linkerId)
    if (!el || !isLinker(el)) return false

    const fallback = presetHit ? null : resolveLinkerHit(el, point)
    const hit = presetHit ?? fallback?.hit
    if (!hit) return false

    const route = presetRoute ?? fallback?.route ?? view.getLinkerRoute(el)
    const editState = resolveBeginEditState({
      linker: el,
      point,
      hit,
      route,
    })

    return beginSession(e, editState.state, {
      prepare: () => {
        if (editState.shouldInsertSegmentWaypoint) {
          edit.update(linkerId, { points: editState.state.startPoints })
        }
      },
    })
  }

  function beginCreateFromPoint(
    e: MouseEvent,
    options: {
      linkerId: string
      point: Point
    },
  ): boolean {
    const { point, linkerId } = options
    const linker = element.create(
      'linker',
      linkerId,
      {
        x: point.x,
        y: point.y,
        binding: { type: 'free' },
      },
      {
        x: point.x,
        y: point.y,
        binding: { type: 'free' },
      },
    )
    if (!linker || !isLinker(linker)) return false
    return beginCreateWithLinker(e, {
      linker,
      context: {
        linkerId: linkerId,
      },
      oppositeShapeId: null,
    })
  }

  function beginCreateFromShape(
    e: MouseEvent,
    options: {
      shapeId: string
      linkerId: string
    },
  ): boolean {
    const { shapeId, linkerId } = options
    const sourceShape = element.getElementById(shapeId)
    if (!sourceShape || !isShape(sourceShape)) return false

    const preferredAnchor = resolveCreateAnchor(sourceShape)
    if (!preferredAnchor) return false

    const fromEndpoint: LinkerEndpoint =
      preferredAnchor.type === 'anchor'
        ? {
            x: preferredAnchor.point.x,
            y: preferredAnchor.point.y,
            angle: preferredAnchor.angle,
            target: sourceShape.id,
            binding: {
              type: 'anchor',
              anchorId: preferredAnchor.id,
            },
          }
        : {
            x: preferredAnchor.point.x,
            y: preferredAnchor.point.y,
            angle: preferredAnchor.angle,
            target: sourceShape.id,
            binding: {
              type: 'edge',
              pathIndex: preferredAnchor.pathIndex,
              segmentIndex: preferredAnchor.segmentIndex,
              t: preferredAnchor.t,
            },
          }

    const toEndpoint: LinkerEndpoint = {
      x: preferredAnchor.point.x,
      y: preferredAnchor.point.y,
      angle: preferredAnchor.angle,
      binding: { type: 'free' },
    }

    const linker = element.create('linker', linkerId, fromEndpoint, toEndpoint)
    if (!linker || !isLinker(linker)) return false
    return beginCreateWithLinker(e, {
      linker,
      context: {
        linkerId: linkerId,
      },
      oppositeShapeId: sourceShape.id,
    })
  }

  function beginCreate(e: MouseEvent, options: BeginLinkerCreateOptions): boolean {
    const { from, linkerId } = options
    return from.type === 'point'
      ? beginCreateFromPoint(e, {
          linkerId: linkerId,
          point: from.point,
        })
      : beginCreateFromShape(e, {
          linkerId: linkerId,
          shapeId: from.shapeId,
        })
  }

  function beginCreateWithLinker(
    e: MouseEvent,
    options: {
      linker: LinkerElement
      context: CreateContext
      oppositeShapeId: string | null
    },
  ): boolean {
    const { linker, context, oppositeShapeId } = options
    const state: DragState = {
      linkerId: linker.id,
      mode: 'to',
      oppositeShapeId,
      startFrom: pick(linker.from, ['x', 'y']),
      startTo: pick(linker.to, ['x', 'y']),
      startRawFrom: { ...linker.from },
      startRawTo: { ...linker.to },
      startPoints: [],
      startTextPosition: {
        dx: linker.textPosition?.dx ?? 0,
        dy: linker.textPosition?.dy ?? 0,
      },
      snapMode: 'auto',
    }

    return beginSession(e, state, {
      context,
      prepare: () => {
        edit.add([linker])
      },
    })
  }

  function beginSession(
    e: MouseEvent,
    state: DragState,
    options: {
      context?: CreateContext
      prepare?: () => void
    } = {},
  ): boolean {
    const { context, prepare } = options
    state.snapMode = resolveSnapMode(e)
    return session.begin({
      event: e,
      state,
      context: context,
      prepare: prepare,
    })
  }

  function move(e: MouseEvent): void {
    session.move(e)
  }

  function moveLine(state: DragState, delta: Point): void {
    setSnapTarget(null)
    edit.update(state.linkerId, {
      from: {
        x: state.startFrom.x + delta.x,
        y: state.startFrom.y + delta.y,
        angle: state.startRawFrom.angle,
        binding: { type: 'free' },
      },
      to: {
        x: state.startTo.x + delta.x,
        y: state.startTo.y + delta.y,
        angle: state.startRawTo.angle,
        binding: { type: 'free' },
      },
      points: state.startPoints.map(p => ({ x: p.x + delta.x, y: p.y + delta.y })),
    })
  }

  function moveText(state: DragState, delta: Point, linkerElement: LinkerElement): void {
    setSnapTarget(null)

    const textOffset = {
      dx: state.startTextPosition.dx + delta.x,
      dy: state.startTextPosition.dy + delta.y,
    }

    if (
      linkerElement.textPosition?.dx === textOffset?.dx &&
      linkerElement.textPosition?.dy === textOffset?.dy &&
      (!!linkerElement.textPosition || !textOffset)
    ) {
      return
    }

    edit.update(state.linkerId, {
      textPosition: textOffset,
    })
  }

  function moveControl(
    state: DragState,
    delta: Point,
    linkerElement: LinkerElement,
    controlIndex: number,
    startControl: Point,
  ): void {
    setSnapTarget(null)

    if (linkerElement.linkerType === 'orthogonal') {
      if (state.controlIndices && state.controlIndices.length > 0 && state.orthogonalMoveAxis) {
        const nextPoints = resolveOrthogonalSegmentPoints(state, delta)
        if (nextPoints) {
          edit.update(state.linkerId, { points: nextPoints })
          return
        }
      }

      const nextPoints = resolveOrthogonalWaypoints(state, delta, controlIndex, startControl)
      if (nextPoints) {
        edit.update(state.linkerId, { points: nextPoints })
        return
      }
    }

    const nextPoints = linkerElement.points.slice()
    nextPoints[controlIndex] = {
      x: startControl.x + delta.x,
      y: startControl.y + delta.y,
    }
    edit.update(state.linkerId, { points: nextPoints })
  }

  function commitWaypoints(
    linkerId: string,
    nextPoints: Point[],
    options: {
      normalize?: boolean
    } = {},
  ): boolean {
    const linker = element.getElementById(linkerId)
    if (!linker || !isLinker(linker)) return false

    const resolvedPoints = options.normalize ? normalizeLinkerManualPoints(linker, nextPoints) : nextPoints

    if (areSamePoints(linker.points, resolvedPoints)) return false

    edit.update(linkerId, { points: resolvedPoints })

    return true
  }

  function resolveOrthogonalSegmentDragState(
    route: LinkerRoute,
    segmentIndex: number,
  ): OrthogonalSegmentDragState | null {
    if (route.points.length < 2) return null
    if (segmentIndex < 0 || segmentIndex >= route.points.length - 1) return null

    const segmentStart = route.points[segmentIndex]
    const segmentEnd = route.points[segmentIndex + 1]
    const moveAxis = resolveOrthogonalAxis(segmentStart, segmentEnd)
    if (!moveAxis) return null

    if (route.points.length === 2) {
      return {
        points: [
          { x: route.points[0].x, y: route.points[0].y },
          { x: route.points[1].x, y: route.points[1].y },
        ],
        controlIndex: 0,
        controlIndices: [0, 1],
        moveAxis,
      }
    }

    const points = route.points.slice(1, -1).map(point => ({ x: point.x, y: point.y }))
    if (segmentIndex === 0) {
      points.unshift({ x: route.points[0].x, y: route.points[0].y })
      return {
        points,
        controlIndex: 0,
        controlIndices: [0, 1],
        moveAxis,
      }
    }

    if (segmentIndex === route.points.length - 2) {
      const lastPoint = route.points[route.points.length - 1]
      points.push({ ...lastPoint })
      return {
        points,
        controlIndex: points.length - 2,
        controlIndices: [points.length - 2, points.length - 1],
        moveAxis,
      }
    }

    return {
      points,
      controlIndex: segmentIndex - 1,
      controlIndices: [segmentIndex - 1, segmentIndex],
      moveAxis,
    }
  }

  function resolveOrthogonalWaypoints(
    state: DragState,
    delta: Point,
    controlIndex: number,
    startControl: Point,
  ): Point[] | null {
    const startPoints = state.startPoints
    const prevPoint = controlIndex === 0 ? state.startFrom : startPoints[controlIndex - 1]
    const nextPoint = controlIndex === startPoints.length - 1 ? state.startTo : startPoints[controlIndex + 1]
    if (!prevPoint || !nextPoint) return null

    const nextPoints = startPoints.map(point => ({ x: point.x, y: point.y }))
    const current = {
      x: startControl.x + delta.x,
      y: startControl.y + delta.y,
    }

    const xBindings: OrthogonalBinding[] = []
    const yBindings: OrthogonalBinding[] = []
    const prevAxis = resolveOrthogonalAxis(prevPoint, startControl)
    const nextAxis = resolveOrthogonalAxis(startControl, nextPoint)

    if (prevAxis === 'x') {
      xBindings.push(
        controlIndex === 0
          ? { type: 'endpoint', point: prevPoint }
          : { type: 'control', index: controlIndex - 1, point: prevPoint },
      )
    } else if (prevAxis === 'y') {
      yBindings.push(
        controlIndex === 0
          ? { type: 'endpoint', point: prevPoint }
          : { type: 'control', index: controlIndex - 1, point: prevPoint },
      )
    }

    if (nextAxis === 'x') {
      xBindings.push(
        controlIndex === startPoints.length - 1
          ? { type: 'endpoint', point: nextPoint }
          : { type: 'control', index: controlIndex + 1, point: nextPoint },
      )
    } else if (nextAxis === 'y') {
      yBindings.push(
        controlIndex === startPoints.length - 1
          ? { type: 'endpoint', point: nextPoint }
          : { type: 'control', index: controlIndex + 1, point: nextPoint },
      )
    }

    if (prevAxis == null || nextAxis == null) {
      return null
    }

    applyOrthogonalAxis('x', current, nextPoints, xBindings)
    applyOrthogonalAxis('y', current, nextPoints, yBindings)
    nextPoints[controlIndex] = current
    return nextPoints
  }

  function resolveOrthogonalSegmentPoints(state: DragState, delta: Point): Point[] | null {
    if (!state.controlIndices || state.controlIndices.length === 0 || !state.orthogonalMoveAxis) return null

    const nextPoints = state.startPoints.map(point => ({ x: point.x, y: point.y }))
    const anchorIndex = state.controlIndices[0]
    const anchorPoint = state.startPoints[anchorIndex]
    if (!anchorPoint) return null

    const axis = state.orthogonalMoveAxis
    const axisDelta = axis === 'x' ? delta.x : delta.y
    const nextValue = anchorPoint[axis] + axisDelta

    for (const index of state.controlIndices) {
      const point = nextPoints[index]
      if (!point) continue
      nextPoints[index] = {
        ...point,
        [axis]: nextValue,
      }
    }

    return nextPoints
  }

  function applyOrthogonalAxis(axis: Axis, current: Point, nextPoints: Point[], bindings: OrthogonalBinding[]): void {
    if (bindings.length === 0) return

    const endpointBinding = bindings.find(binding => binding.type === 'endpoint')
    const nextValue = endpointBinding ? endpointBinding.point[axis] : current[axis]
    current[axis] = nextValue

    for (const binding of bindings) {
      if (binding.type !== 'control') continue
      nextPoints[binding.index] = {
        ...nextPoints[binding.index],
        [axis]: nextValue,
      }
    }
  }

  function normalizeWaypoints(linkerId: string): void {
    const linker = element.getElementById(linkerId)
    if (!linker || !isLinker(linker)) return
    commitWaypoints(linkerId, linker.points, { normalize: true })
  }

  function removeWaypoint(linkerId: string, index: number): boolean {
    const linker = element.getElementById(linkerId)
    if (!linker || !isLinker(linker)) return false
    if (!supportsManualWaypoints(linker.linkerType)) return false

    const nextPoints = removeWaypointAt(linker.points, index)
    if (!nextPoints) return false

    return commitWaypoints(linkerId, nextPoints, {
      normalize: true,
    })
  }

  function moveEndpoint(
    state: DragState,
    delta: Point,
    zoom: number,
    linkerElement: LinkerElement,
    event: MouseEvent,
  ): void {
    state.snapMode = resolveSnapMode(event)
    const snapMode = state.snapMode
    const mode = state.mode
    const startPoint = mode === 'from' ? state.startFrom : state.startTo
    const target = {
      x: startPoint.x + delta.x,
      y: startPoint.y + delta.y,
    }
    const maxDistance = snapDistance / zoom
    const stickDistance = snapStickDistance / zoom
    const oppositePoint = mode === 'from' ? linkerElement.to : linkerElement.from
    const nextSnapTarget = findNearestAnchor(target, {
      snapMode,
      maxDistance,
      stickDistance,
      preferred: snapTarget(),
      oppositePoint,
    })
    setSnapTarget(nextSnapTarget)

    const endpoint =
      snapOnMove && nextSnapTarget
        ? nextSnapTarget
        : createFreeEndpoint(target, Math.atan2(oppositePoint.y - target.y, oppositePoint.x - target.x))

    edit.update(state.linkerId, { [mode]: endpoint })
  }

  function end(): void {
    session.end()
  }

  function cancel(): void {
    session.cancel()
  }

  function snapEndpoint(state: DragState, mode: LinkerEndpointMode): void {
    const el = element.getElementById(state.linkerId)
    if (!el || !isLinker(el)) return

    const currentPoint = pick(mode === 'from' ? el.from : el.to, ['x', 'y'])
    const zoom = view.zoom()
    const maxDistance = snapDistance / zoom
    const stickDistance = snapStickDistance / zoom
    const oppositePoint = pick(mode === 'from' ? el.to : el.from, ['x', 'y'])
    const target =
      snapTarget() ??
      findNearestAnchor(currentPoint, {
        snapMode: state.snapMode,
        maxDistance,
        stickDistance,
        oppositePoint,
      })
    if (!target) return

    edit.update(state.linkerId, { [mode]: target })
  }

  function createFreeEndpoint(point: Point, angle: number): LinkerEndpoint {
    return {
      x: point.x,
      y: point.y,
      angle,
      binding: { type: 'free' },
    }
  }

  function findNearestAnchor(
    point: Point,
    options: {
      snapMode: LinkerSnapMode
      maxDistance: number
      stickDistance: number
      preferred?: BoundLinkerEndpoint | null
      oppositePoint?: Point
    },
  ): BoundLinkerEndpoint | null {
    const { snapMode, maxDistance, stickDistance, preferred, oppositePoint } = options

    if (preferred) {
      const resolved = resolveBoundEndpoint(preferred)
      if (
        resolved &&
        isSnapTargetAllowed(resolved, snapMode) &&
        getDistance(point, pick(resolved, ['x', 'y'])) <= maxDistance + stickDistance
      ) {
        return resolved
      }
    }

    let best: BoundLinkerEndpoint | null = null
    let bestScore = Infinity
    const weight = Math.max(0, directionBias)

    for (const candidate of snapCandidates.list) {
      const { shape, anchorCandidates } = candidate

      if (snapMode !== 'edge') {
        for (const anchor of anchorCandidates) {
          const distance = getDistance(point, anchor.point)
          if (distance > maxDistance) continue

          let score = distance
          if (oppositePoint && weight > 0) {
            const desiredAngle = Math.atan2(oppositePoint.y - anchor.point.y, oppositePoint.x - anchor.point.x)
            const diff = normalizeAngleDiff(desiredAngle, anchor.angle)
            score += (diff / Math.PI) * weight * maxDistance
          }
          score -= anchorBias * maxDistance

          if (score <= bestScore) {
            bestScore = score
            best = {
              x: anchor.point.x,
              y: anchor.point.y,
              angle: anchor.angle,
              target: shape.id,
              binding: {
                type: 'anchor',
                anchorId: anchor.id,
              },
            }
          }
        }
      }

      if (snapMode === 'anchor') continue

      const edgeInfo = getEdgeInfo(shape, point)
      if (!edgeInfo || edgeInfo.distance > maxDistance) continue

      let score = edgeInfo.distance
      if (oppositePoint && weight > 0) {
        const desiredAngle = Math.atan2(oppositePoint.y - edgeInfo.point.y, oppositePoint.x - edgeInfo.point.x)
        const diff = normalizeAngleDiff(desiredAngle, edgeInfo.angle)
        score += (diff / Math.PI) * weight * maxDistance
      }
      score += edgePenalty * maxDistance

      if (score <= bestScore) {
        bestScore = score
        best = {
          x: edgeInfo.point.x,
          y: edgeInfo.point.y,
          angle: edgeInfo.angle,
          target: shape.id,
          binding: {
            type: 'edge',
            pathIndex: edgeInfo.pathIndex,
            segmentIndex: edgeInfo.segmentIndex,
            t: edgeInfo.t,
          },
        }
      }
    }

    return best
  }

  function getDragSnapshot(): LinkerDragSnapshot | null {
    const state = session.state()
    if (!state) return null

    return {
      linkerId: state.linkerId,
      mode: state.mode,
      controlIndex: state.controlIndex,
      oppositeShapeId: state.oppositeShapeId,
    }
  }

  onCleanup(() => {
    if (session.isPending()) cancel()
  })

  return {
    isActive: session.isActive,
    isDragging: session.isDragging,
    state: getDragSnapshot,
    isShapeLinkable: (shapeId: string) => isShapeLinkable(shapeId, session.state() ?? undefined),
    snapTarget,
    hitTest,
    resolveHitResult,
    beginEdit,
    beginCreate,
    removeWaypoint,
    move,
    end,
    cancel,
  }
}

export type CreateLinkerDrag = ReturnType<typeof createLinkerDrag>

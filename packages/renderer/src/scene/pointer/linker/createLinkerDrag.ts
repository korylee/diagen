import { createSignal, onCleanup } from 'solid-js'
import {
  getShapeAnchorInfo,
  getShapePerimeterInfo,
  isLinker,
  resolvePreferredCreateAnchor,
  resolveShapePerimeterInfo,
  type LinkerElement,
  type LinkerEndpointBinding,
  type LinkerEndpoint,
  type LinkerRoute,
  type ShapeElement,
} from '@diagen/core'
import type { Point } from '@diagen/shared'
import { getDistance, isSameNumber } from '@diagen/shared'
import { useDesigner } from '../../../context'
import { hitTestLinker, type LinkerHit } from '../../../utils'
import {
  areSamePoints,
  normalizeLinkerManualPoints,
  removeControlPointAt,
  supportsManualControlPoints,
} from '../../linker/normalizeManualPoints'
import type { EventToCanvas } from '../../services/createCoordinateService'
import { createDragSession } from '../shared/createDragSession'
import type { CreatePointerDragTrackerOptions } from '../shared/createPointerDragTracker'
import { createPointerDeltaState } from '../shared/createPointerDeltaState'

export type LinkerDragMode = 'from' | 'to' | 'control' | 'line' | 'text'
type LinkerEndpointMode = Extract<LinkerDragMode, 'from' | 'to'>
type LinkerEndpointPatch = Pick<LinkerElement, 'from'> | Pick<LinkerElement, 'to'>

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
  startTextPosition: {
    dx: number
    dy: number
  }
}

interface CreateContext {
  createdLinkerId: string
  linkerId: string
}

interface LinkerDragStartInput {
  event: MouseEvent
  state: DragState
  createContext?: CreateContext | null
  prepare?: () => void
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
  eventToCanvas?: EventToCanvas
  endpointTolerance?: number
  lineTolerance?: number
  controlTolerance?: number
  segmentTolerance?: number
  snapDistance?: number
  snapOnMove?: boolean
  snapStickDistance?: number
  directionBias?: number
  fixedAnchorBias?: number
  perimeterPenalty?: number
  allowSelfConnect?: boolean
}

interface EndpointTarget {
  shapeId: string | null
  binding: LinkerEndpointBinding
  point: Point
  angle: number
}

interface FixedAnchorCandidate {
  id: string
  point: Point
  angle: number
}

interface SnapShapeCandidate {
  shape: ShapeElement
  fixedAnchors: FixedAnchorCandidate[]
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

function createEmptySnapCandidates(): SnapCandidateCollection {
  return {
    list: [],
    byId: new Map(),
  }
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
    fixedAnchorBias = 0.18,
    perimeterPenalty = 0.12,
    allowSelfConnect = true,
  } = options

  const { edit, view, element, history, selection } = useDesigner()
  const transaction = history.transaction.createScope('拖拽连线')
  const pointerDelta = createPointerDeltaState({ eventToCanvas })

  const [snapTarget, setSnapTarget] = createSignal<AnchorHit | null>(null)
  const [createContext, setCreateContext] = createSignal<CreateContext | null>(null)
  let snapCandidates: SnapCandidateCollection = createEmptySnapCandidates()
  let session!: ReturnType<typeof createDragSession<LinkerDragStartInput, DragState>>
  session = createDragSession({
    threshold,
    transaction,
    transactionMode: 'on-begin',
    getEvent: input => input.event,
    setup: input => {
      input.prepare?.()
      setCreateContext(input.createContext ?? null)
      snapCandidates = buildSnapCandidates(input.state)
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
        moveEndpoint(state, state.mode, delta, zoom, linker)
      }
    },
    finalize: ({ state, shouldCommit }) => {
      if (!shouldCommit || !state) return
      if (state.mode === 'control') {
        normalizeControlPoints(state.linkerId)
        scheduleLinkerAutoGrow(state.linkerId)
        return
      }
      if (state.mode === 'text') {
        scheduleLinkerAutoGrow(state.linkerId)
        return
      }
      if (!isEndpointMode(state.mode)) return

      snapEndpoint(state, state.mode)
      scheduleLinkerAutoGrow(state.linkerId)
    },
    reset: () => {
      setSnapTarget(null)
      setCreateContext(null)
      snapCandidates = createEmptySnapCandidates()
      pointerDelta.reset()
    },
    onCommit: () => {
      view.flushAutoGrow()

      const currentCreateContext = createContext()
      if (currentCreateContext) {
        selection.replace([currentCreateContext.createdLinkerId])
      }
    },
  })

  function isShapeLinkableShape(shape: ShapeElement, state?: DragState): boolean {
    if (!shape.visible || shape.locked) return false
    if (shape.attribute?.visible === false || shape.attribute?.linkable === false) return false
    if (!allowSelfConnect && state?.oppositeShapeId && shape.id === state.oppositeShapeId) return false
    return true
  }

  function isShapeLinkable(shapeId: string, state?: DragState): boolean {
    const shape = element.getElementById(shapeId)
    return !!shape && shape.type === 'shape' && isShapeLinkableShape(shape, state)
  }

  function buildSnapCandidates(state?: DragState): SnapCandidateCollection {
    const list: SnapShapeCandidate[] = []
    const byId = new Map<string, SnapShapeCandidate>()

    for (const shape of element.shapes()) {
      if (!isShapeLinkableShape(shape, state)) continue

      const fixedAnchors: FixedAnchorCandidate[] = []
      for (let index = 0; index < shape.anchors.length; index++) {
        const info = getShapeAnchorInfo(shape, index)
        if (!info) continue
        fixedAnchors.push({
          id: info.id,
          point: info.point,
          angle: info.angle,
        })
      }

      const candidate: SnapShapeCandidate = {
        shape,
        fixedAnchors,
      }
      list.push(candidate)
      byId.set(shape.id, candidate)
    }

    return {
      list,
      byId,
    }
  }

  function resolveInitialSnapTarget(state: DragState): AnchorHit | null {
    if (!isEndpointMode(state.mode)) return null

    const endpoint = state.mode === 'from' ? state.startRawFrom : state.startRawTo
    if (!endpoint.id || endpoint.binding.type === 'free') return null

    return resolveAnchorHit({
      shapeId: endpoint.id,
      binding: endpoint.binding,
      point: { x: endpoint.x, y: endpoint.y },
      angle: endpoint.angle ?? 0,
    })
  }

  function resolveAnchorHit(hit: AnchorHit): AnchorHit | null {
    const candidate = snapCandidates.byId.get(hit.shapeId)
    if (!candidate) return null
    const { shape } = candidate

    if (hit.binding.type === 'fixed') {
      const binding = hit.binding as Extract<LinkerEndpointBinding, { type: 'fixed' }>
      const info = candidate.fixedAnchors.find(anchor => anchor.id === binding.anchorId)
      if (!info) return null
      return {
        shapeId: shape.id,
        binding: { type: 'fixed', anchorId: info.id },
        anchorId: info.id,
        point: info.point,
        angle: info.angle,
      }
    }

    if (hit.binding.type === 'perimeter') {
      const info = resolveShapePerimeterInfo(shape, hit.binding)
      if (!info) return null
      return {
        shapeId: shape.id,
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
      zoom: view.transform().zoom,
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
    const el = element.getElementById(linkerId)
    if (!el || !isLinker(el)) return null
    const result = getHitWithRoute(el, point)
    if (!result.hit) return null
    return {
      hit: result.hit,
      route: result.route,
    }
  }

  function beginEdit(e: MouseEvent, options: BeginLinkerEditOptions): boolean {
    const { linkerId, point, hit: presetHit, route: presetRoute } = options
    const el = element.getElementById(linkerId)
    if (!el || !isLinker(el)) return false

    const fallback = presetHit ? null : getHitWithRoute(el, point)
    const hit = presetHit ?? fallback?.hit
    if (!hit) return false

    const route = presetRoute ?? fallback?.route ?? view.getLinkerRoute(el)
    let mode: LinkerDragMode = 'line'
    let controlIndex = hit.controlIndex
    let controlIndices: number[] | undefined
    let orthogonalMoveAxis: Axis | undefined
    let startControl: Point | undefined
    let startPoints = el.points.map(p => ({ x: p.x, y: p.y }))

    if (hit.type === 'from' || hit.type === 'to') {
      mode = hit.type
    } else if (hit.type === 'text') {
      mode = 'text'
    } else if (hit.type === 'control') {
      mode = 'control'
      startControl = controlIndex !== undefined ? el.points[controlIndex] : undefined
    } else if (hit.type === 'segment') {
      mode = 'control'
      const segmentState =
        el.linkerType === 'orthogonal'
          ? prepareOrthogonalSegmentDragState(route, hit.segmentIndex ?? 0)
          : null

      if (segmentState) {
        startPoints = segmentState.points
        controlIndex = segmentState.controlIndex
        controlIndices = segmentState.controlIndices
        orthogonalMoveAxis = segmentState.moveAxis
        startControl = segmentState.points[segmentState.controlIndex]
      } else {
        const insertionIndex =
          startPoints.length === 0 ? 0 : Math.max(0, Math.min(startPoints.length, hit.segmentIndex ?? startPoints.length))
        const insertedPoint = { x: point.x, y: point.y }
        startPoints = [...startPoints]
        startPoints.splice(insertionIndex, 0, insertedPoint)
        controlIndex = insertionIndex
        startControl = insertedPoint
      }
    }

    const state: DragState = {
      linkerId,
      mode,
      controlIndex,
      controlIndices,
      orthogonalMoveAxis,
      oppositeShapeId: (mode === 'from' ? el.to.id : mode === 'to' ? el.from.id : null) ?? null,
      startFrom: route.points[0],
      startTo: route.points[route.points.length - 1],
      startControl,
      startRawFrom: { ...el.from },
      startRawTo: { ...el.to },
      startPoints,
      startTextPosition: {
        dx: el.textPosition?.dx ?? 0,
        dy: el.textPosition?.dy ?? 0,
      },
    }

    return beginSession(e, state, {
      prepare: () => {
        if (hit.type === 'segment') {
          edit.update(linkerId, { points: startPoints })
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
    const point = options.point
    const linker = element.create(
      'linker',
      options.linkerId,
      {
        id: null,
        x: point.x,
        y: point.y,
        binding: { type: 'free' },
      },
      {
        id: null,
        x: point.x,
        y: point.y,
        binding: { type: 'free' },
      },
    )
    if (!linker || !isLinker(linker)) return false
    return beginCreateWithLinker(e, {
      linker,
      createContext: {
        createdLinkerId: linker.id,
        linkerId: options.linkerId,
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
    const sourceShape = element.getElementById(options.shapeId)
    if (!sourceShape || sourceShape.type !== 'shape') return false

    const preferredAnchor = resolvePreferredCreateAnchor(sourceShape)
    if (!preferredAnchor) return false

    const fromBinding: LinkerEndpointBinding =
      preferredAnchor.type === 'fixed'
        ? { type: 'fixed', anchorId: preferredAnchor.id }
        : {
            type: 'perimeter',
            pathIndex: preferredAnchor.pathIndex,
            segmentIndex: preferredAnchor.segmentIndex,
            t: preferredAnchor.t,
          }

    const fromEndpoint: LinkerEndpoint = {
      id: sourceShape.id,
      x: preferredAnchor.point.x,
      y: preferredAnchor.point.y,
      angle: preferredAnchor.angle,
      binding: fromBinding,
    }

    const toEndpoint: LinkerEndpoint = {
      id: null,
      x: preferredAnchor.point.x,
      y: preferredAnchor.point.y,
      angle: preferredAnchor.angle,
      binding: { type: 'free' },
    }

    const linker = element.create('linker', options.linkerId, fromEndpoint, toEndpoint)
    if (!linker || !isLinker(linker)) return false
    return beginCreateWithLinker(e, {
      linker,
      createContext: {
        createdLinkerId: linker.id,
        linkerId: options.linkerId,
      },
      oppositeShapeId: sourceShape.id,
    })
  }

  function beginCreate(e: MouseEvent, options: BeginLinkerCreateOptions): boolean {
    return options.from.type === 'point'
      ? beginCreateFromPoint(e, {
          linkerId: options.linkerId,
          point: options.from.point,
        })
      : beginCreateFromShape(e, {
          linkerId: options.linkerId,
          shapeId: options.from.shapeId,
        })
  }

  function beginCreateWithLinker(
    e: MouseEvent,
    options: {
      linker: LinkerElement
      createContext: CreateContext
      oppositeShapeId: string | null
    },
  ): boolean {
    const { linker, createContext, oppositeShapeId } = options
    const state: DragState = {
      linkerId: linker.id,
      mode: 'to',
      oppositeShapeId,
      startFrom: { x: linker.from.x, y: linker.from.y },
      startTo: { x: linker.to.x, y: linker.to.y },
      startRawFrom: { ...linker.from },
      startRawTo: { ...linker.to },
      startPoints: [],
      startTextPosition: {
        dx: linker.textPosition?.dx ?? 0,
        dy: linker.textPosition?.dy ?? 0,
      },
    }

    return beginSession(e, state, {
      createContext,
      prepare: () => {
        edit.add([linker])
      },
    })
  }

  function beginSession(
    e: MouseEvent,
    state: DragState,
    options: {
      createContext?: CreateContext | null
      prepare?: () => void
    } = {},
  ): boolean {
    return session.begin({
      event: e,
      state,
      createContext: options.createContext ?? null,
      prepare: options.prepare,
    })
  }

  function move(e: MouseEvent): void {
    session.move(e)
  }

  function moveLine(state: DragState, delta: Point): void {
    setSnapTarget(null)
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

  function moveText(state: DragState, delta: Point, linkerElement: LinkerElement): void {
    setSnapTarget(null)

    const textOffset = normalizeTextPosition({
      dx: state.startTextPosition.dx + delta.x,
      dy: state.startTextPosition.dy + delta.y,
    })

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
    scheduleLinkerAutoGrow(state.linkerId)
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
          scheduleLinkerAutoGrow(state.linkerId)
          return
        }
      }

      const nextPoints = resolveOrthogonalControlPoints(state, delta, controlIndex, startControl)
      if (nextPoints) {
        edit.update(state.linkerId, { points: nextPoints })
        scheduleLinkerAutoGrow(state.linkerId)
        return
      }
    }

    const nextPoints = linkerElement.points.slice()
    nextPoints[controlIndex] = {
      x: startControl.x + delta.x,
      y: startControl.y + delta.y,
    }
    edit.update(state.linkerId, { points: nextPoints })
    scheduleLinkerAutoGrow(state.linkerId)
  }

  function commitControlPoints(
    linkerId: string,
    nextPoints: Point[],
    options: {
      normalize?: boolean
      flushAutoGrow?: boolean
    } = {},
  ): boolean {
    const linker = element.getElementById(linkerId)
    if (!linker || !isLinker(linker)) return false

    const resolvedPoints = options.normalize ? normalizeLinkerManualPoints(linker, nextPoints) : nextPoints

    if (areSamePoints(linker.points, resolvedPoints)) return false

    edit.update(linkerId, { points: resolvedPoints })
    scheduleLinkerAutoGrow(linkerId)

    if (options.flushAutoGrow) {
      view.flushAutoGrow()
    }

    return true
  }

  function prepareOrthogonalSegmentDragState(route: LinkerRoute, segmentIndex: number): OrthogonalSegmentDragState | null {
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
      points.push({ x: route.points[route.points.length - 1].x, y: route.points[route.points.length - 1].y })
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

  function resolveOrthogonalControlPoints(
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
      xBindings.push(controlIndex === 0 ? { type: 'endpoint', point: prevPoint } : { type: 'control', index: controlIndex - 1, point: prevPoint })
    } else if (prevAxis === 'y') {
      yBindings.push(controlIndex === 0 ? { type: 'endpoint', point: prevPoint } : { type: 'control', index: controlIndex - 1, point: prevPoint })
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

    if ((prevAxis === null && nextAxis === null) || (prevAxis === null && nextAxis !== null) || (prevAxis !== null && nextAxis === null)) {
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

  function applyOrthogonalAxis(
    axis: Axis,
    current: Point,
    nextPoints: Point[],
    bindings: OrthogonalBinding[],
  ): void {
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

  function normalizeControlPoints(linkerId: string): void {
    const linker = element.getElementById(linkerId)
    if (!linker || !isLinker(linker)) return
    commitControlPoints(linkerId, linker.points, { normalize: true })
  }

  function removeControlPoint(linkerId: string, index: number): boolean {
    const linker = element.getElementById(linkerId)
    if (!linker || !isLinker(linker)) return false
    if (!supportsManualControlPoints(linker.linkerType)) return false

    const nextPoints = removeControlPointAt(linker.points, index)
    if (!nextPoints) return false

    return commitControlPoints(linkerId, nextPoints, {
      normalize: true,
      flushAutoGrow: true,
    })
  }

  function moveEndpoint(
    state: DragState,
    mode: LinkerEndpointMode,
    delta: Point,
    zoom: number,
    linkerElement: LinkerElement,
  ): void {
    const startPoint = mode === 'from' ? state.startFrom : state.startTo
    const target = {
      x: startPoint.x + delta.x,
      y: startPoint.y + delta.y,
    }
    const maxDistance = snapDistance / zoom
    const stickDistance = snapStickDistance / zoom
    const oppositePoint = mode === 'from' ? linkerElement.to : linkerElement.from
    const nextSnapTarget = findNearestAnchor(target, {
      maxDistance,
      stickDistance,
      preferred: snapTarget(),
      oppositePoint,
    })
    setSnapTarget(nextSnapTarget)

    edit.update(
      state.linkerId,
      buildEndpointPatch(
        mode,
        getEndpointByMode(linkerElement, mode),
        resolveMoveEndpointTarget(target, oppositePoint, nextSnapTarget),
      ),
    )
    scheduleLinkerAutoGrow(state.linkerId)
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

    const currentPoint = mode === 'from' ? { x: el.from.x, y: el.from.y } : { x: el.to.x, y: el.to.y }
    const zoom = view.transform().zoom
    const maxDistance = snapDistance / zoom
    const stickDistance = snapStickDistance / zoom
    const oppositePoint = mode === 'from' ? el.to : el.from
    const target =
      snapTarget() ??
      findNearestAnchor(currentPoint, {
        maxDistance,
        stickDistance,
        oppositePoint,
      })
    if (!target) return

    edit.update(state.linkerId, buildEndpointPatch(mode, getEndpointByMode(el, mode), target))
  }

  function isEndpointMode(mode: LinkerDragMode): mode is LinkerEndpointMode {
    return mode === 'from' || mode === 'to'
  }

  function getEndpointByMode(
    linker: LinkerElement,
    mode: LinkerEndpointMode,
  ): LinkerElement['from'] | LinkerElement['to'] {
    return mode === 'from' ? linker.from : linker.to
  }

  function resolveMoveEndpointTarget(
    target: Point,
    oppositePoint: Point,
    nextSnapTarget: AnchorHit | null,
  ): EndpointTarget {
    if (snapOnMove && nextSnapTarget) {
      return {
        shapeId: nextSnapTarget.shapeId,
        binding: nextSnapTarget.binding,
        point: nextSnapTarget.point,
        angle: nextSnapTarget.angle,
      }
    }

    return {
      shapeId: null,
      binding: { type: 'free' },
      point: target,
      angle: Math.atan2(oppositePoint.y - target.y, oppositePoint.x - target.x),
    }
  }

  function normalizeTextPosition(
    textPosition: {
      dx: number
      dy: number
    },
  ): LinkerElement['textPosition'] {
    if (isSameNumber(textPosition.dx, 0) && isSameNumber(textPosition.dy, 0)) {
      return undefined
    }

    return {
      dx: textPosition.dx,
      dy: textPosition.dy,
    }
  }

  function buildEndpointPatch(
    mode: LinkerEndpointMode,
    endpoint: LinkerElement['from'] | LinkerElement['to'],
    target: EndpointTarget,
  ): LinkerEndpointPatch {
    const nextEndpoint = {
      ...endpoint,
      id: target.shapeId,
      binding: target.binding,
      angle: target.angle,
      x: target.point.x,
      y: target.point.y,
    }

    return mode === 'from' ? { from: nextEndpoint } : { to: nextEndpoint }
  }

  function scheduleLinkerAutoGrow(linkerId: string): void {
    const linker = element.getElementById(linkerId)
    if (!linker || !isLinker(linker)) return
    view.scheduleAutoGrow(view.getLinkerBounds(linker))
  }

  function findNearestAnchor(
    point: Point,
    options: {
      maxDistance: number
      stickDistance: number
      preferred?: AnchorHit | null
      oppositePoint?: Point
    },
  ): AnchorHit | null {
    const { maxDistance, stickDistance, preferred, oppositePoint } = options

    if (preferred) {
      const resolved = resolveAnchorHit(preferred)
      if (resolved && getDistance(point, resolved.point) <= maxDistance + stickDistance) {
        return resolved
      }
    }

    let best: AnchorHit | null = null
    let bestScore = Infinity
    const weight = Math.max(0, directionBias)

    for (const candidate of snapCandidates.list) {
      const { shape, fixedAnchors } = candidate

      for (const anchor of fixedAnchors) {
        const distance = getDistance(point, anchor.point)
        if (distance > maxDistance) continue

        let score = distance
        if (oppositePoint && weight > 0) {
          const desiredAngle = Math.atan2(oppositePoint.y - anchor.point.y, oppositePoint.x - anchor.point.x)
          const diff = normalizeAngleDiff(desiredAngle, anchor.angle)
          // 角度差越大惩罚越高，避免临近锚点间频繁抖动。
          score += (diff / Math.PI) * weight * maxDistance
        }
        // 同等条件下优先固定锚点，再回退到 perimeter。
        score -= fixedAnchorBias * maxDistance

        if (score <= bestScore) {
          bestScore = score
          best = {
            shapeId: shape.id,
            binding: { type: 'fixed', anchorId: anchor.id },
            anchorId: anchor.id,
            point: anchor.point,
            angle: anchor.angle,
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
      score += perimeterPenalty * maxDistance

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
    hitTestWithRoute,
    hitTest,
    beginEdit,
    beginCreate,
    removeControlPoint,
    move,
    end,
    cancel,
  }
}

export type CreateLinkerDrag = ReturnType<typeof createLinkerDrag>

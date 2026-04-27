import type { Bounds, Point, Axis } from '@diagen/shared'
import { normalizeBounds } from '@diagen/shared'

type GuideAxis = Axis
type GuideLineKind = 'start' | 'center' | 'end'

export type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/**
 * 吸附线数据：
 * - axis=x: 垂直线，pos 为 x，from/to 为 y 范围
 * - axis=y: 水平线，pos 为 y，from/to 为 x 范围
 */
export interface GuideLine {
  axis: GuideAxis
  pos: number
  from: number
  to: number
  distance?: number
  distanceFrom?: number
  distanceTo?: number
}

interface GuideLineRef {
  value: number
  kind: GuideLineKind
}

interface AxisSnapCandidate {
  delta: number
  target: GuideLineRef
  targetBounds: Bounds
}

export interface GuideCommonOptions {
  /** 吸附阈值（画布坐标） */
  tolerance?: number
  /** 是否参与中心线吸附，默认 true */
  includeCenter?: boolean
}

export interface MoveGuideInput extends GuideCommonOptions {
  movingBounds: Bounds
  delta: Point
  candidates: Bounds[]
}

export interface MoveGuideResult {
  delta: Point
  snappedX: boolean
  snappedY: boolean
  guides: GuideLine[]
}

export interface ResizeGuideInput extends GuideCommonOptions {
  draftBounds: Bounds
  direction: ResizeDirection
  candidates: Bounds[]
  minWidth?: number
  minHeight?: number
}

export interface ResizeGuideResult {
  bounds: Bounds
  snappedX: boolean
  snappedY: boolean
  guides: GuideLine[]
}

const DEFAULT_TOLERANCE = 4
const DEFAULT_MIN_SIZE = 1

/**
 * move 场景吸附：
 * - 输入原始 bounds 与拖拽 delta
 * - 输出吸附后的 delta 与 guide lines
 */
export function calculateMoveGuideSnap(input: MoveGuideInput): MoveGuideResult {
  const tolerance = input.tolerance ?? DEFAULT_TOLERANCE
  const includeCenter = input.includeCenter ?? true
  const movingBounds = normalizeBounds(input.movingBounds)
  const movedBounds: Bounds = {
    x: movingBounds.x + input.delta.x,
    y: movingBounds.y + input.delta.y,
    w: movingBounds.w,
    h: movingBounds.h,
  }
  const candidates = normalizeCandidates(input.candidates)

  const xSnap = findBestSnap({
    axis: 'x',
    sourceBounds: movedBounds,
    candidateBounds: candidates,
    tolerance,
    includeCenter,
  })
  const ySnap = findBestSnap({
    axis: 'y',
    sourceBounds: movedBounds,
    candidateBounds: candidates,
    tolerance,
    includeCenter,
  })

  const snappedDelta: Point = {
    x: input.delta.x + (xSnap?.delta ?? 0),
    y: input.delta.y + (ySnap?.delta ?? 0),
  }
  const snappedBounds: Bounds = {
    x: movingBounds.x + snappedDelta.x,
    y: movingBounds.y + snappedDelta.y,
    w: movingBounds.w,
    h: movingBounds.h,
  }

  return {
    delta: snappedDelta,
    snappedX: xSnap !== null,
    snappedY: ySnap !== null,
    guides: buildGuideLines(snappedBounds, xSnap, ySnap),
  }
}

/**
 * resize 场景吸附：
 * - 输入 resize 过程中的 draft bounds
 * - 按方向尝试边线吸附并输出修正后的 bounds
 */
export function calculateResizeGuideSnap(input: ResizeGuideInput): ResizeGuideResult {
  const tolerance = input.tolerance ?? DEFAULT_TOLERANCE
  const includeCenter = input.includeCenter ?? true
  const minWidth = input.minWidth ?? DEFAULT_MIN_SIZE
  const minHeight = input.minHeight ?? DEFAULT_MIN_SIZE
  const candidates = normalizeCandidates(input.candidates)

  let nextBounds = normalizeBounds(input.draftBounds)
  let xSnapApplied: AxisSnapCandidate | null = null
  let ySnapApplied: AxisSnapCandidate | null = null

  if (isHorizontalResizable(input.direction)) {
    const sourceValue = getResizeEdgeValue(nextBounds, 'x', input.direction)
    const xSnap = findBestSnapByValue({
      axis: 'x',
      sourceValue,
      candidateBounds: candidates,
      tolerance,
      includeCenter,
    })
    if (xSnap) {
      const applied = applyResizeAxisSnap(nextBounds, input.direction, 'x', xSnap.delta, minWidth)
      if (applied.applied) {
        nextBounds = applied.bounds
        xSnapApplied = xSnap
      }
    }
  }

  if (isVerticalResizable(input.direction)) {
    const sourceValue = getResizeEdgeValue(nextBounds, 'y', input.direction)
    const ySnap = findBestSnapByValue({
      axis: 'y',
      sourceValue,
      candidateBounds: candidates,
      tolerance,
      includeCenter,
    })
    if (ySnap) {
      const applied = applyResizeAxisSnap(nextBounds, input.direction, 'y', ySnap.delta, minHeight)
      if (applied.applied) {
        nextBounds = applied.bounds
        ySnapApplied = ySnap
      }
    }
  }

  return {
    bounds: nextBounds,
    snappedX: xSnapApplied !== null,
    snappedY: ySnapApplied !== null,
    guides: buildGuideLines(nextBounds, xSnapApplied, ySnapApplied),
  }
}

function buildGuideLines(
  sourceBounds: Bounds,
  xSnap: AxisSnapCandidate | null,
  ySnap: AxisSnapCandidate | null,
): GuideLine[] {
  const lines: GuideLine[] = []

  if (xSnap) {
    const distanceRange = getAxisDistanceRange(sourceBounds, xSnap.targetBounds, 'y')
    lines.push({
      axis: 'x',
      pos: xSnap.target.value,
      from: Math.min(sourceBounds.y, xSnap.targetBounds.y),
      to: Math.max(sourceBounds.y + sourceBounds.h, xSnap.targetBounds.y + xSnap.targetBounds.h),
      distance: distanceRange?.distance,
      distanceFrom: distanceRange?.from,
      distanceTo: distanceRange?.to,
    })
  }

  if (ySnap) {
    const distanceRange = getAxisDistanceRange(sourceBounds, ySnap.targetBounds, 'x')
    lines.push({
      axis: 'y',
      pos: ySnap.target.value,
      from: Math.min(sourceBounds.x, ySnap.targetBounds.x),
      to: Math.max(sourceBounds.x + sourceBounds.w, ySnap.targetBounds.x + ySnap.targetBounds.w),
      distance: distanceRange?.distance,
      distanceFrom: distanceRange?.from,
      distanceTo: distanceRange?.to,
    })
  }

  return lines
}

function normalizeCandidates(candidates: Bounds[]): Bounds[] {
  return candidates.map(candidate => normalizeBounds(candidate)).filter(candidate => candidate.w > 0 && candidate.h > 0)
}

function getAxisDistanceRange(
  sourceBounds: Bounds,
  targetBounds: Bounds,
  axis: GuideAxis,
): { distance: number; from: number; to: number } | null {
  const sourceStart = axis === 'x' ? sourceBounds.x : sourceBounds.y
  const sourceEnd = axis === 'x' ? sourceBounds.x + sourceBounds.w : sourceBounds.y + sourceBounds.h
  const targetStart = axis === 'x' ? targetBounds.x : targetBounds.y
  const targetEnd = axis === 'x' ? targetBounds.x + targetBounds.w : targetBounds.y + targetBounds.h

  if (sourceEnd <= targetStart) {
    return {
      distance: targetStart - sourceEnd,
      from: sourceEnd,
      to: targetStart,
    }
  }

  if (targetEnd <= sourceStart) {
    return {
      distance: sourceStart - targetEnd,
      from: targetEnd,
      to: sourceStart,
    }
  }

  return null
}

function getGuideRefs(bounds: Bounds, axis: GuideAxis, includeCenter: boolean): GuideLineRef[] {
  if (axis === 'x') {
    const lines: GuideLineRef[] = [
      { value: bounds.x, kind: 'start' },
      { value: bounds.x + bounds.w, kind: 'end' },
    ]
    if (includeCenter) {
      lines.splice(1, 0, { value: bounds.x + bounds.w / 2, kind: 'center' })
    }
    return lines
  }

  const lines: GuideLineRef[] = [
    { value: bounds.y, kind: 'start' },
    { value: bounds.y + bounds.h, kind: 'end' },
  ]
  if (includeCenter) {
    lines.splice(1, 0, { value: bounds.y + bounds.h / 2, kind: 'center' })
  }
  return lines
}

function findBestSnap(params: {
  axis: GuideAxis
  sourceBounds: Bounds
  candidateBounds: Bounds[]
  tolerance: number
  includeCenter: boolean
}): AxisSnapCandidate | null {
  const sourceLines = getGuideRefs(params.sourceBounds, params.axis, params.includeCenter)
  return findBestSnapFromLines(sourceLines, params.axis, params.candidateBounds, params.tolerance, params.includeCenter)
}

function findBestSnapByValue(params: {
  axis: GuideAxis
  sourceValue: number
  candidateBounds: Bounds[]
  tolerance: number
  includeCenter: boolean
}): AxisSnapCandidate | null {
  const sourceLines: GuideLineRef[] = [{ value: params.sourceValue, kind: 'start' }]
  return findBestSnapFromLines(sourceLines, params.axis, params.candidateBounds, params.tolerance, params.includeCenter)
}

function findBestSnapFromLines(
  sourceLines: GuideLineRef[],
  axis: GuideAxis,
  candidateBounds: Bounds[],
  tolerance: number,
  includeCenter: boolean,
): AxisSnapCandidate | null {
  let best: AxisSnapCandidate | null = null

  for (const candidateBound of candidateBounds) {
    const targetLines = getGuideRefs(candidateBound, axis, includeCenter)
    for (const source of sourceLines) {
      for (const target of targetLines) {
        const delta = target.value - source.value
        const absDelta = Math.abs(delta)
        if (absDelta > tolerance) continue

        if (
          best === null ||
          absDelta < Math.abs(best.delta) ||
          (absDelta === Math.abs(best.delta) &&
            getLineKindPriority(target.kind) > getLineKindPriority(best.target.kind))
        ) {
          best = {
            delta,
            target,
            targetBounds: candidateBound,
          }
        }
      }
    }
  }

  return best
}

function getLineKindPriority(kind: GuideLineKind): number {
  switch (kind) {
    case 'center':
      return 3
    case 'start':
      return 2
    case 'end':
    default:
      return 1
  }
}

function isHorizontalResizable(direction: ResizeDirection): boolean {
  return direction.includes('e') || direction.includes('w')
}

function isVerticalResizable(direction: ResizeDirection): boolean {
  return direction.includes('n') || direction.includes('s')
}

function getResizeEdgeValue(bounds: Bounds, axis: GuideAxis, direction: ResizeDirection): number {
  if (axis === 'x') {
    return direction.includes('w') ? bounds.x : bounds.x + bounds.w
  }
  return direction.includes('n') ? bounds.y : bounds.y + bounds.h
}

function applyResizeAxisSnap(
  bounds: Bounds,
  direction: ResizeDirection,
  axis: GuideAxis,
  delta: number,
  minSize: number,
): { bounds: Bounds; applied: boolean } {
  if (axis === 'x') {
    if (direction.includes('w')) {
      const nextWidth = bounds.w - delta
      if (nextWidth < minSize) return { bounds, applied: false }
      return {
        bounds: {
          x: bounds.x + delta,
          y: bounds.y,
          w: nextWidth,
          h: bounds.h,
        },
        applied: true,
      }
    }

    if (direction.includes('e')) {
      const nextWidth = bounds.w + delta
      if (nextWidth < minSize) return { bounds, applied: false }
      return {
        bounds: {
          x: bounds.x,
          y: bounds.y,
          w: nextWidth,
          h: bounds.h,
        },
        applied: true,
      }
    }
  } else {
    if (direction.includes('n')) {
      const nextHeight = bounds.h - delta
      if (nextHeight < minSize) return { bounds, applied: false }
      return {
        bounds: {
          x: bounds.x,
          y: bounds.y + delta,
          w: bounds.w,
          h: nextHeight,
        },
        applied: true,
      }
    }

    if (direction.includes('s')) {
      const nextHeight = bounds.h + delta
      if (nextHeight < minSize) return { bounds, applied: false }
      return {
        bounds: {
          x: bounds.x,
          y: bounds.y,
          w: bounds.w,
          h: nextHeight,
        },
        applied: true,
      }
    }
  }

  return { bounds, applied: false }
}

import { isLinker, isShape } from '@diagen/core'
import { getAnchorInfo } from '@diagen/core/anchors'
import { getLinkerTextBox } from '@diagen/core/text'
import { type Point } from '@diagen/shared'
import { createMemo } from 'solid-js'
import { useDesigner } from '../../../context/DesignerProvider'
import { useInteraction } from '../../../context/InteractionProvider'
import type { RectHighlightItem } from '../RectHighlightOverlay'
import { createRoutePath } from './createRoutePath'
import { LinkQuickCreatePanel } from './LinkQuickCreatePanel'
import { LinkTargetHighlights } from './LinkTargetHighlights'
import { SelectedLinkerOverlay } from './SelectedLinkerOverlay'
import type { LinkerWaypointHandle, QuickCreateAction, QuickCreatePanel, QuickCreatePlacement } from './types'

import './index.scss'

const QUICK_CREATE_ITEMS: ReadonlyArray<QuickCreateAction> = [
  { id: 'linker', label: '折线' },
  { id: 'straight_linker', label: '直线' },
  { id: 'curve_linker', label: '曲线' },
] as const

const QUICK_CREATE_PANEL_OFFSETS: Record<QuickCreatePanel['placement'], { x: number; y: number }> = {
  left: { x: -10, y: -4 },
  right: { x: 10, y: -4 },
  top: { x: 0, y: -10 },
  bottom: { x: 0, y: 10 },
}

export function LinkerOverlay() {
  const { selection, element, state, tool, view } = useDesigner()
  const { coordinate, pointer } = useInteraction()

  const isLinkEndDragging = createMemo(() => {
    const mode = pointer.linkerDrag.state()?.mode
    return pointer.linkerDrag.isActive() && (mode === 'from' || mode === 'to')
  })

  const targetItems = createMemo(() => {
    if (!isLinkEndDragging()) return []
    const activeId = pointer.linkerDrag.snapTarget()?.target ?? null

    return element
      .shapes()
      .filter(shape => pointer.linkerDrag.isShapeLinkable(shape.id))
      .map((shape, index) => {
        const itemState = activeId === shape.id ? 'active' : 'candidate'
        const bounds = coordinate.canvasToScreen(view.getShapeBounds(shape))

        return {
          id: `${shape.id}:link-target:${itemState}:frame:${index * 1000}`,
          bounds,
          border: itemState === 'active' ? 'var(--dg-hl-link-outline-active)' : 'var(--dg-hl-link-outline)',
          background: itemState === 'active' ? 'var(--dg-hl-link-bg-active)' : 'var(--dg-hl-link-bg)',
          dataAttrs: {
            'data-shape-highlight-id': shape.id,
            'data-shape-highlight-kind': 'link-target',
            'data-shape-highlight-state': itemState,
          },
        }
      })
  })

  const selectedQuickCreateShape = createMemo(() => {
    if (!pointer.machine.isIdle() || !tool.isIdle()) return null

    const ids = selection.selectedIds()
    if (ids.length !== 1) return null

    const target = element.getElementById(ids[0])
    return target && isShape(target) && !target.locked && target.attribute.linkable ? target : null
  })

  const quickCreatePanel = createMemo<QuickCreatePanel | null>(() => {
    const shape = selectedQuickCreateShape()
    if (!shape) return null

    const placement: QuickCreatePlacement = 'right'
    const offset = QUICK_CREATE_PANEL_OFFSETS[placement]
    const bounds = coordinate.canvasToScreen(view.getShapeBounds(shape))

    return {
      shapeId: shape.id,
      actions: QUICK_CREATE_ITEMS,
      placement,
      origin: {
        x: bounds.x + bounds.w + offset.x,
        y: bounds.y + offset.y,
      },
    }
  })

  const startQuickCreate = (e: MouseEvent, shapeId: string, linkerId: string) => {
    e.preventDefault()
    e.stopPropagation()
    pointer.machine.beginLinkerCreate(e, {
      linkerId,
      from: {
        type: 'shape',
        shapeId,
      },
    })
  }

  const selectedLinker = createMemo(() => {
    if (!tool.isIdle()) return null
    const selectedIds = selection.selectedIds()
    if (selectedIds.length !== 1) return null
    const selected = element.getElementById(selectedIds[0])
    return selected && isLinker(selected) ? selected : null
  })

  const layout = createMemo(() => {
    const linker = selectedLinker()
    if (!linker) return null
    return view.getLinkerLayout(linker)
  })
  const route = createMemo(() => layout()?.route ?? null)

  const routePath = createMemo(() => {
    const linker = selectedLinker()
    const linkerRoute = route()
    if (!linker || !linkerRoute || linkerRoute.points.length < 2) return ''
    const screenPoints = linkerRoute.points.map(point => coordinate.canvasToScreen(point))
    return createRoutePath(screenPoints, linker.linkerType)
  })

  const endpointHandles = createMemo(() => {
    const linkerRoute = route()
    if (!linkerRoute || linkerRoute.points.length < 2) return null

    const fromPoint = linkerRoute.points[0]
    const toPoint = linkerRoute.points[linkerRoute.points.length - 1]
    return {
      from: {
        screen: coordinate.canvasToScreen(fromPoint),
        canvas: fromPoint,
      },
      to: {
        screen: coordinate.canvasToScreen(toPoint),
        canvas: toPoint,
      },
    }
  })

  const waypointHandles = createMemo<LinkerWaypointHandle[]>(() => {
    const linker = selectedLinker()
    if (!linker) return []
    return linker.points.map((point, index) => ({
      index,
      screen: coordinate.canvasToScreen(point),
      canvas: point,
    }))
  })
  const textBounds = createMemo(() => {
    const linker = selectedLinker()
    const routeValue = route()
    if (!linker || !routeValue) return null

    const box = getLinkerTextBox(routeValue, linker.text, linker.fontStyle, {
      curved: linker.linkerType === 'curved',
      textPosition: linker.textPosition,
    })
    if (!box) return null

    const bounds = coordinate.canvasToScreen({
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
    })

    return {
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
    }
  })
  const snapTarget = createMemo(() => pointer.linkerDrag.snapTarget())
  const fixedSnapTarget = createMemo(() => {
    const candidate = snapTarget()
    return candidate && candidate.binding.type === 'fixed' ? candidate : null
  })
  const anchorItems = createMemo(() => {
    const candidate = fixedSnapTarget()
    if (!candidate) return []
    const target = element.getElementById(candidate.target)
    if (!target || !isShape(target)) return []

    const anchorSize = state.config.anchorSize
    const items: RectHighlightItem[] = []

    for (let index = 0; index < target.anchors.length; index++) {
      const anchor = getAnchorInfo(target, index)
      if (!anchor) continue
      const screenPoint = coordinate.canvasToScreen(anchor.point)
      const isActive = candidate.binding.type === 'fixed' && candidate.binding.anchorId === anchor.id

      items.push({
        id: `${candidate.target}:anchor-preview:${anchor.id}:${index}`,
        bounds: {
          x: screenPoint.x - anchorSize / 2,
          y: screenPoint.y - anchorSize / 2,
          w: anchorSize,
          h: anchorSize,
        },
        border: isActive ? '2px solid var(--dg-anchor-color)' : 'var(--dg-anchor-border)',
        background: isActive ? 'var(--dg-anchor-color)' : 'var(--dg-anchor-background)',
        radius: anchorSize / 2,
        dataAttrs: {
          'data-shape-highlight-id': candidate.target,
          'data-shape-highlight-kind': 'anchor-preview',
          'data-shape-highlight-state': 'armed',
          'data-shape-highlight-part': 'anchor',
          'data-shape-highlight-anchor-id': anchor.id,
          'data-shape-highlight-anchor-index': String(anchor.index),
          'data-shape-highlight-anchor-active': String(isActive),
        },
      })
    }

    return items
  })

  const startEndpointDrag = (e: MouseEvent, type: 'from' | 'to') => {
    const linker = selectedLinker()
    const linkerRoute = route()
    const handles = endpointHandles()
    if (!linker || !handles) return
    e.stopPropagation()
    e.preventDefault()
    const point = handles[type].canvas
    pointer.machine.beginLinkerEdit(e, {
      linkerId: linker.id,
      point,
      hit: { type },
      route: linkerRoute ?? undefined,
    })
  }

  const startControlDrag = (e: MouseEvent, index: number, point: Point) => {
    const linker = selectedLinker()
    const linkerRoute = route()
    if (!linker) return
    e.stopPropagation()
    e.preventDefault()
    pointer.machine.beginLinkerEdit(e, {
      linkerId: linker.id,
      point,
      hit: { type: 'control', controlIndex: index },
      route: linkerRoute ?? undefined,
    })
  }

  const removeWaypoint = (e: MouseEvent, index: number) => {
    const linker = selectedLinker()
    if (!linker) return

    e.stopPropagation()
    e.preventDefault()
    pointer.linkerDrag.removeWaypoint(linker.id, index)
  }

  const overlayModel = createMemo(() => {
    const handles = endpointHandles()
    if (!selectedLinker() || !handles) return null

    return {
      routePath: routePath(),
      endpointHandles: handles,
      waypointHandles: waypointHandles(),
      textBounds: textBounds(),
      anchorItems: anchorItems(),
    }
  })

  return (
    <>
      <LinkTargetHighlights
        isLinkEndDragging={isLinkEndDragging()}
        targets={targetItems()}
      />

      <LinkQuickCreatePanel panel={quickCreatePanel()} onStart={startQuickCreate} />

      <SelectedLinkerOverlay
        model={overlayModel()}
        onStartEndpointDrag={startEndpointDrag}
        onStartControlDrag={(event, handle) => startControlDrag(event, handle.index, handle.canvas)}
        onRemoveWaypoint={(event, handle) => removeWaypoint(event, handle.index)}
      />
    </>
  )
}

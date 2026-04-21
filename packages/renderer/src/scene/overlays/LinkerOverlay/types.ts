import type { RectHighlightItem } from '../RectHighlightOverlay'

export interface QuickCreateAction {
  id: string
  label: string
}

export type QuickCreatePlacement = 'left' | 'right' | 'top' | 'bottom'

export interface QuickCreatePanel {
  shapeId: string
  actions: ReadonlyArray<QuickCreateAction>
  placement: QuickCreatePlacement
  origin: {
    x: number
    y: number
  }
}

export interface LinkerEndpointHandle {
  screen: {
    x: number
    y: number
  }
  canvas: {
    x: number
    y: number
  }
}

export interface LinkerEndpointHandles {
  from: LinkerEndpointHandle
  to: LinkerEndpointHandle
}

export interface LinkerWaypointHandle {
  index: number
  screen: {
    x: number
    y: number
  }
  canvas: {
    x: number
    y: number
  }
}

export interface LinkerTextBounds {
  x: number
  y: number
  w: number
  h: number
}

export interface SelectedLinkerOverlayModel {
  routePath: string
  endpointHandles: LinkerEndpointHandles
  waypointHandles: LinkerWaypointHandle[]
  textBounds: LinkerTextBounds | null
  anchorItems: RectHighlightItem[]
}

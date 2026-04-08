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

export interface LinkerControlHandle {
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

export interface SelectedLinkerOverlayModel {
  routePath: string
  endpointHandles: LinkerEndpointHandles
  controlHandles: LinkerControlHandle[]
  anchorItems: RectHighlightItem[]
}

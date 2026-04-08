import { Renderer, type RendererContextMenuRequest } from '@diagen/renderer'
import { createSignal, Show } from 'solid-js'
import { ContextMenu } from './contextMenu'
import type { ContextMenuState } from './contextMenu'
import type { EditorProps } from './types'

const defaultContextMenuState: ContextMenuState = {
  open: false,
  position: { x: 0, y: 0 },
  context: {
    targetType: 'canvas',
    targetId: null,
    selectionIds: [],
    canvasPosition: { x: 0, y: 0 },
  },
}

export function Editor(props: EditorProps) {
  const [contextMenuState, setContextMenuState] = createSignal<ContextMenuState>(defaultContextMenuState)

  const handleContextMenuRequest = (request: RendererContextMenuRequest) => {
    // Keep renderer output as the single source of truth for menu placement
    // and semantic context so Editor only coordinates UI composition.
    setContextMenuState({
      open: true,
      position: request.clientPosition,
      context: {
        targetType: request.targetType,
        targetId: request.targetId,
        selectionIds: request.selectionIds,
        canvasPosition: request.canvasPosition,
      },
    })
  }

  const closeContextMenu = () => {
    setContextMenuState(current => ({
      ...current,
      open: false,
    }))
  }

  return (
    <>
      <Renderer
        class={props.class}
        style={props.style}
        shapeGuideTolerance={props.shapeGuideTolerance}
        resizeGuideTolerance={props.resizeGuideTolerance}
        onContextMenu={props.contextMenu?.disabled ? undefined : handleContextMenuRequest}
      />
      <Show when={!props.contextMenu?.disabled}>
        <ContextMenu
          state={contextMenuState()}
          entries={props.contextMenu?.entries}
          style={props.contextMenu?.style}
          renderIcon={props.contextMenu?.renderIcon}
          onClose={closeContextMenu}
        />
      </Show>
    </>
  )
}

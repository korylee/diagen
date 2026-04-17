import { Renderer, mergeRendererDefaults, type RendererContextMenuRequest } from '@diagen/renderer'
import { createMemo, createSignal, Show } from 'solid-js'
import { ContextMenu } from './contextMenu'
import type { ContextMenuState } from './contextMenu'
import type { EditorProps } from './types'
import { useUIDefaults } from '../config'

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
  const defaults = useUIDefaults()
  const rendererDefaults = createMemo(() => mergeRendererDefaults(defaults().renderer, props.rendererDefaults))
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
        defaults={rendererDefaults()}
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

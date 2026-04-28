import { Renderer, type RendererContextMenuRequest } from '@diagen/renderer'
import { createMemo, createSignal, Show } from 'solid-js'
import type { Point } from '@diagen/shared'
import { useUIDefaults } from '../config'
import type { ContextMenuContext } from './contextMenu'
import { ContextMenu, createContextMenuBridge } from './contextMenu'
import type { EditorProps } from './types'

const defaultContext: ContextMenuContext = {
  targetType: 'canvas',
  targetId: null,
  selectionIds: [],
  canvasPosition: { x: 0, y: 0 },
}

export function Editor(props: EditorProps) {
  const defaults = useUIDefaults()
  const rendererDefaults = createMemo(() => {
    const base = defaults().renderer
    if (!props.interaction) {
      return base
    }
    return { ...base, ...props.interaction }
  })
  const [contextMenuContext, setContextMenuContext] = createSignal<ContextMenuContext>(defaultContext)
  const [contextMenuOpen, setContextMenuOpen] = createSignal(false)
  const [contextMenuPosition, setContextMenuPosition] = createSignal<Point>({ x: 0, y: 0 })
  const contextMenuBridge = createContextMenuBridge(contextMenuContext, props.contextMenu?.entries)

  const handleContextMenu = (request: RendererContextMenuRequest) => {
    setContextMenuContext({
      targetType: request.targetType,
      targetId: request.targetId,
      selectionIds: request.selectionIds,
      canvasPosition: request.canvasPosition,
    })
    setContextMenuPosition(request.clientPosition)
    setContextMenuOpen(true)
  }

  const closeContextMenu = () => {
    setContextMenuOpen(false)
  }

  const handleContextMenuSelect = (id: string) => {
    contextMenuBridge.execute(id)
  }

  return (
    <>
      <Renderer
        class={props.class}
        style={props.style}
        defaults={rendererDefaults()}
        onContextMenu={props.contextMenu?.disabled ? undefined : handleContextMenu}
        overlay={
          <>
            <Show when={!props.contextMenu?.disabled}>
              <ContextMenu
                open={contextMenuOpen()}
                position={contextMenuPosition()}
                items={contextMenuBridge.items()}
                onSelect={handleContextMenuSelect}
                style={props.contextMenu?.style}
                renderIcon={props.contextMenu?.renderIcon}
                onClose={closeContextMenu}
              />
            </Show>
          </>
        }
      />
    </>
  )
}

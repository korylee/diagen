import { For, Show } from 'solid-js'
import { createDgBem } from '@diagen/shared'
import { RectHighlightOverlay } from '../RectHighlightOverlay'
import type { LinkerControlHandle, SelectedLinkerOverlayModel } from './types'

const bem = createDgBem('linker-overlay')

export function SelectedLinkerOverlay(props: {
  model: SelectedLinkerOverlayModel | null
  onStartEndpointDrag: (event: MouseEvent, type: 'from' | 'to') => void
  onStartControlDrag: (event: MouseEvent, handle: LinkerControlHandle) => void
}) {
  return (
    <Show when={props.model}>
      {resolvedModel => {
        const model = resolvedModel()
        return (
          <div
            style={{
              position: 'absolute',
              left: '0',
              top: '0',
              width: '100%',
              height: '100%',
              'pointer-events': 'none',
              'z-index': 1001,
            }}
          >
            <svg
              style={{
                position: 'absolute',
                left: '0',
                top: '0',
                width: '100%',
                height: '100%',
                overflow: 'visible',
                'pointer-events': 'none',
              }}
            >
              <path
                d={model.routePath}
                fill="none"
                stroke="var(--dg-selection-color)"
                stroke-width={1.5}
                stroke-dasharray="4,3"
              />
            </svg>

            <div
              class={bem('from-endpoint')}
              style={{
                position: 'absolute',
                left: `${model.endpointHandles.from.screen.x}px`,
                top: `${model.endpointHandles.from.screen.y}px`,
              }}
              onMouseDown={event => props.onStartEndpointDrag(event, 'from')}
            />

            <div
              class={bem('to-endpoint')}
              style={{
                position: 'absolute',
                left: `${model.endpointHandles.to.screen.x}px`,
                top: `${model.endpointHandles.to.screen.y}px`,
              }}
              onMouseDown={event => props.onStartEndpointDrag(event, 'to')}
            />

            <For each={model.controlHandles}>
              {handle => (
                <div
                  style={{
                    position: 'absolute',
                    left: `${handle.screen.x}px`,
                    top: `${handle.screen.y}px`,
                    width: `var(--dg-handle-size)`,
                    height: `var(--dg-handle-size)`,
                    transform: 'translate(-50%, -50%)',
                    'background-color': 'var(--dg-handle-background)',
                    border: 'var(--dg-handle-border)',
                    'border-radius': 'var(--dg-anchor-radius)',
                    cursor: 'move',
                    'pointer-events': 'auto',
                  }}
                  onMouseDown={event => props.onStartControlDrag(event, handle)}
                />
              )}
            </For>

            <RectHighlightOverlay items={model.anchorItems} visible={model.anchorItems.length > 0} zIndex={9998} />
          </div>
        )
      }}
    </Show>
  )
}

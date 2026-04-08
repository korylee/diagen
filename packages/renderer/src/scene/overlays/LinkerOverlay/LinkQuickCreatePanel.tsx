import { For, Show } from 'solid-js'
import { createDgBem } from '@diagen/shared'
import type { QuickCreatePanel } from './types'

const BADGE_STYLE = {
  width: '16px',
  height: '16px',
  'border-radius': '999px',
  background: 'rgba(14, 116, 144, 0.12)',
  color: '#0f766e',
  display: 'inline-flex',
  'align-items': 'center',
  'justify-content': 'center',
  'font-size': '11px',
} as const

const bem = createDgBem('linker-overlay')

export function LinkQuickCreatePanel(props: {
  panel: QuickCreatePanel | null
  onStart: (event: MouseEvent, shapeId: string, linkerId: string) => void
}) {
  return (
    <Show when={props.panel}>
      {resolvedPanel => {
        const panel = resolvedPanel()
        return (
          <div
            class={bem('panel', { [panel.placement]: true })}
            style={{
              position: 'absolute',
              left: `${panel.origin.x}px`,
              top: `${panel.origin.y}px`,
            }}
            data-linker-create-panel="true"
            data-quick-create-shape-id={panel.shapeId}
            data-quick-create-placement={panel.placement}
          >
            <For each={panel.actions}>
              {action => (
                <button
                  type="button"
                  class={bem('panel-item')}
                  onMouseDown={event => props.onStart(event, panel.shapeId, action.id)}
                >
                  <span>{action.label}</span>
                  <span style={BADGE_STYLE}>+</span>
                </button>
              )}
            </For>
          </div>
        )
      }}
    </Show>
  )
}

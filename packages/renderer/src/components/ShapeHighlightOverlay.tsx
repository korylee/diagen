import { createMemo, For, Show } from 'solid-js'

export type ShapeHighlightTone = 'connectable' | 'forbidden' | 'custom'

export interface ShapeHighlightItem {
  id: string
  bounds: {
    x: number
    y: number
    w: number
    h: number
  }
  tone?: ShapeHighlightTone
  active?: boolean
  outline?: string
  background?: string
}

export interface ShapeHighlightOverlayProps {
  items: () => ShapeHighlightItem[]
  visible?: () => boolean
  zIndex?: number
}

const toneTokenMap: Record<
  ShapeHighlightTone,
  {
    outline: string
    background: string
    activeOutline: string
    activeBackground: string
  }
> = {
  connectable: {
    outline: 'var(--dg-hl-link-outline)',
    background: 'var(--dg-hl-link-bg)',
    activeOutline: 'var(--dg-hl-link-outline-active)',
    activeBackground: 'var(--dg-hl-link-bg-active)',
  },
  forbidden: {
    outline: 'var(--dg-hl-deny-outline)',
    background: 'var(--dg-hl-deny-bg)',
    activeOutline: 'var(--dg-hl-deny-outline-active)',
    activeBackground: 'var(--dg-hl-deny-bg-active)',
  },
  custom: {
    outline: 'var(--dg-hl-custom-outline)',
    background: 'var(--dg-hl-custom-bg)',
    activeOutline: 'var(--dg-hl-custom-outline-active)',
    activeBackground: 'var(--dg-hl-custom-bg-active)',
  },
}

function resolveShapeHighlightStyle(item: ShapeHighlightItem): { outline: string; background: string } {
  if (item.outline || item.background) {
    return {
      outline: item.outline ?? 'none',
      background: item.background ?? 'transparent',
    }
  }

  const tone = item.tone ?? 'custom'
  const tokens = toneTokenMap[tone]
  return {
    outline: item.active ? tokens.activeOutline : tokens.outline,
    background: item.active ? tokens.activeBackground : tokens.background,
  }
}

/**
 * 通用 Shape 高亮层：
 * - 支持语义化 tone（connectable/forbidden/custom）
 * - 支持 active 态和按条目覆盖样式（outline/background）
 */
export function ShapeHighlightOverlay(props: ShapeHighlightOverlayProps) {
  const items = createMemo(() => props.items())
  const shouldRender = createMemo(() => {
    const enabled = props.visible ? props.visible() : true
    return enabled && items().length > 0
  })

  return (
    <Show when={shouldRender()}>
      <div
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          width: '100%',
          height: '100%',
          'pointer-events': 'none',
          'z-index': props.zIndex ?? 999,
        }}
      >
        <For each={items()}>
          {item => {
            const style = resolveShapeHighlightStyle(item)
            return (
              <div
                style={{
                  position: 'absolute',
                  left: `${item.bounds.x}px`,
                  top: `${item.bounds.y}px`,
                  width: `${item.bounds.w}px`,
                  height: `${item.bounds.h}px`,
                  border: style.outline,
                  'background-color': style.background,
                  'box-sizing': 'border-box',
                  'pointer-events': 'none',
                }}
              />
            )
          }}
        </For>
      </div>
    </Show>
  )
}

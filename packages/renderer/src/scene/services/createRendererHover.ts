import { createRafLoop } from '@diagen/primitives'
import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js'
import type { SceneHit } from '../../utils'

interface HoverPointerSnapshot {
  clientX: number
  clientY: number
  target: EventTarget | null
}

interface CreateRendererHoverOptions {
  getContainerEl: Accessor<HTMLElement | null>
  isPointerActive: () => boolean
  isTextEditing: () => boolean
  isToolIdle: () => boolean
  hitTest: (pointer: { clientX: number; clientY: number }) => SceneHit | null
}

export function createRendererHover(options: CreateRendererHoverOptions) {
  const { getContainerEl, isPointerActive, isTextEditing, isToolIdle, hitTest } = options
  const [hoverCursor, setHoverCursor] = createSignal<string | null>(null)
  let latestHoverPointer: HoverPointerSnapshot | null = null

  const clearHover = () => {
    latestHoverPointer = null
    hoverLoop.pause()
    setHoverCursor(null)
  }

  const applyHoverCursor = (pointerSnapshot: HoverPointerSnapshot | null) => {
    if (!pointerSnapshot || isPointerActive() || isTextEditing() || !isToolIdle()) {
      setHoverCursor(null)
      return
    }

    const container = getContainerEl()
    if (!container) {
      setHoverCursor(null)
      return
    }

    const target = pointerSnapshot.target
    if (!(target instanceof Node) || !container.contains(target)) {
      setHoverCursor(null)
      return
    }

    const sceneHit = hitTest({
      clientX: pointerSnapshot.clientX,
      clientY: pointerSnapshot.clientY,
    })

    setHoverCursor(sceneHit?.type === 'linker' && sceneHit.hit.type === 'text' ? 'move' : null)
  }

  const hoverLoop = createRafLoop(
    () => {
      applyHoverCursor(latestHoverPointer)
      latestHoverPointer = null
      return false
    },
    {
      immediate: false,
      once: true,
    },
  )

  const onSceneMouseMove = (event: MouseEvent) => {
    latestHoverPointer = {
      clientX: event.clientX,
      clientY: event.clientY,
      target: event.target,
    }
    applyHoverCursor(latestHoverPointer)
    hoverLoop.resume()
  }

  createEffect(() => {
    if (isPointerActive() || isTextEditing() || !isToolIdle()) {
      clearHover()
    }
  })

  onCleanup(() => {
    clearHover()
  })

  return {
    cursor: hoverCursor,
    move: onSceneMouseMove,
    leave: clearHover,
  }
}

export type RendererHover = ReturnType<typeof createRendererHover>

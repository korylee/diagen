import { batch, createSignal, onCleanup, onMount } from 'solid-js'
import type { Point } from '@diagen/shared'
import { useDesigner } from '../components'

// ============================================================================
// 平移 Hook - 与 Designer 集成
// ============================================================================

export function usePan(
  options: {
    button?: number // 默认中键(1)
  } = {},
) {
  const { button = 1 } = options
  const designer = useDesigner()
  const { view } = designer

  const [isPanning, setIsPanning] = createSignal(false)
  const [isSpacePressed, setIsSpacePressed] = createSignal(false)
  const [startMouse, setStartMouse] = createSignal<Point | null>(null)
  const [startViewport, setStartViewport] = createSignal<Point | null>(null)

  onMount(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    onCleanup(() => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    })
  })

  const canPan = (e: MouseEvent): boolean => e.button === button || (isSpacePressed() && e.button === 0)

  const start = (e: MouseEvent) => {
    if (!canPan(e)) return
    const vp = designer.state.viewport
    batch(() => {
      setIsPanning(true)
      setStartMouse({ x: e.clientX, y: e.clientY })
      setStartViewport({ x: vp.x, y: vp.y })
    })
  }

  const move = (e: MouseEvent) => {
    const sm = startMouse()
    const sv = startViewport()
    if (!isPanning() || !sm || !sv) return
    view.pan(sv.x + e.clientX - sm.x, sv.y + e.clientY - sm.y)
  }

  const end = () => {
    batch(() => {
      setIsPanning(false)
      setStartMouse(null)
      setStartViewport(null)
    })
  }

  onCleanup(() => {
    if (isPanning()) end()
  })

  return { isPanning, isSpacePressed, canPan, start, move, end }
}

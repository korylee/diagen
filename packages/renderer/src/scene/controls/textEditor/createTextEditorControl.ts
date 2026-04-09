import { isLinker, isShape } from '@diagen/core'
import type { Point } from '@diagen/shared'
import { createEffect, createMemo, createSignal } from 'solid-js'
import { getLinkerTextBox, hitTestScene, isPointInLinkerTextBox, isPointInShapeTextBox } from '../../../utils'
import { useDesigner } from '../../../context/DesignerProvider'
import type { Interaction } from '../../../context/InteractionProvider'

export type TextEditorSession =
  | {
      type: 'shape'
      elementId: string
    }
  | {
      type: 'linker'
      elementId: string
    }

function isTextEditorTarget(target: EventTarget | null): boolean {
  return target instanceof Element && !!target.closest('[data-text-editor="true"]')
}

function shouldOpenTextEditor(params: {
  sceneHit: ReturnType<typeof hitTestScene>
  point: Point
}): boolean {
  const { sceneHit, point } = params
  if (!sceneHit) return false

  if (sceneHit.type === 'shape') {
    return isPointInShapeTextBox(sceneHit.element, point)
  }

  const box = getLinkerTextBox(sceneHit.route, sceneHit.element.text, sceneHit.element.fontStyle, {
    curved: sceneHit.element.linkerType === 'curved',
    textPosition: sceneHit.element.textPosition,
  })
  if (!box) return false
  return isPointInLinkerTextBox(point, box)
}

export function createTextEditorControl(params: { interaction: Interaction }) {
  const designer = useDesigner()
  const { interaction } = params
  const [session, setSession] = createSignal<TextEditorSession | null>(null)
  const [draft, setDraft] = createSignal('')
  const isEditing = createMemo(() => !!session())

  const cancel = () => {
    setSession(null)
  }

  const commit = () => {
    const current = session()
    if (!current) return

    const nextText = draft().replace(/\r\n/g, '\n')
    const currentElement = designer.element.getElementById(current.elementId)

    if (!currentElement) {
      cancel()
      return
    }

    if (current.type === 'shape' && isShape(currentElement)) {
      const previous = currentElement.textBlock[0]?.text ?? ''
      if (previous !== nextText && currentElement.textBlock.length > 0) {
        designer.edit.update(current.elementId, 'textBlock', blocks => {
          const nextBlocks = blocks.slice()
          const first = nextBlocks[0]
          if (!first) return blocks
          nextBlocks[0] = {
            ...first,
            text: nextText,
          }
          return nextBlocks
        })
      }
      cancel()
      return
    }

    if (current.type === 'linker' && isLinker(currentElement)) {
      if (currentElement.text !== nextText) {
        designer.edit.update(current.elementId, 'text', nextText)
      }
      cancel()
    }
  }

  const open = (nextSession: TextEditorSession) => {
    const currentElement = designer.element.getElementById(nextSession.elementId)
    if (!currentElement) return

    designer.selection.replace([nextSession.elementId])

    if (nextSession.type === 'shape' && isShape(currentElement)) {
      setDraft(currentElement.textBlock[0]?.text ?? '')
      setSession(nextSession)
      return
    }

    if (nextSession.type === 'linker' && isLinker(currentElement)) {
      setDraft(currentElement.text ?? '')
      setSession(nextSession)
    }
  }

  const handleExternalEvent = (target: EventTarget | null): boolean => {
    if (!session()) return false
    if (isTextEditorTarget(target)) return true
    commit()
    return false
  }

  const onMouseDown = (event: MouseEvent): boolean => {
    return handleExternalEvent(event.target)
  }

  const onContextMenu = (event: MouseEvent): boolean => {
    return handleExternalEvent(event.target)
  }

  const onDoubleClick = (event: MouseEvent) => {
    if (session()) return
    if (event.button !== 0) return
    if (!interaction.pointer.machine.isIdle()) return
    if (designer.tool.toolState().type !== 'idle') return

    const canvasPosition = interaction.coordinate.eventToCanvas(event)
    const sceneHit = hitTestScene(designer.element.elements(), canvasPosition, {
      zoom: designer.view.transform().zoom,
      getLinkerLayout: linker => designer.view.getLinkerLayout(linker),
    })

    if (!sceneHit || (sceneHit.type !== 'shape' && sceneHit.type !== 'linker')) return
    if (!shouldOpenTextEditor({ sceneHit, point: canvasPosition })) return

    event.preventDefault()
    event.stopPropagation()

    open({
      type: sceneHit.type,
      elementId: sceneHit.element.id,
    })
  }

  createEffect(() => {
    const current = session()
    if (!current) return

    if (designer.tool.toolState().type !== 'idle') {
      commit()
    }
  })

  createEffect(() => {
    const current = session()
    if (!current) return

    const selectedIds = designer.selection.selectedIds()
    if (selectedIds.length !== 1 || selectedIds[0] !== current.elementId) {
      commit()
    }
  })

  return {
    session,
    draft,
    setDraft,
    isEditing,
    commit,
    cancel,
    onMouseDown,
    onContextMenu,
    onDoubleClick,
  }
}

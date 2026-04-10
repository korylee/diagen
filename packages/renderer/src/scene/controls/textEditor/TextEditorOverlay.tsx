import { isLinker, isShape, type FontStyle } from '@diagen/core'
import { getLinkerTextBox, getShapeTextBox } from '@diagen/core/text'
import { createEffect, createMemo, createSignal, type Accessor } from 'solid-js'
import { useDesigner } from '../../../context/DesignerProvider'
import type { TextEditorSession } from './createTextEditorControl'

function toCssColor(color: string | undefined): string {
  if (!color) return 'rgb(50,50,50)'
  if (color.startsWith('#') || color.startsWith('rgb')) return color
  const parts = color.split(',')
  if (parts.length >= 3) return `rgb(${parts[0]},${parts[1]},${parts[2]})`
  return color
}

const BasePaddingX = 6
const BasePaddingY = 4
const MaxEditorHeight = 240
const MaxEditorWidth = 420

function getVerticalPadding(text: string, fontStyle: FontStyle, boxHeight: number, zoom: number) {
  const fontSize = (fontStyle.size || 13) * zoom
  const lineHeight = fontSize * (fontStyle.lineHeight || 1.25)
  const lineCount = Math.max(text.split('\n').length, 1)
  const contentHeight = lineCount * lineHeight
  const freeSpace = Math.max(0, boxHeight - contentHeight - BasePaddingY * 2)

  if (fontStyle.vAlign === 'bottom') {
    return {
      top: BasePaddingY + freeSpace,
      bottom: BasePaddingY,
    }
  }

  if (fontStyle.vAlign === 'middle') {
    const offset = BasePaddingY + freeSpace / 2
    return {
      top: offset,
      bottom: offset,
    }
  }

  return {
    top: BasePaddingY,
    bottom: BasePaddingY + freeSpace,
  }
}

export function TextEditorOverlay(props: {
  session: Accessor<TextEditorSession | null>
  draft: Accessor<string>
  setDraft: (value: string) => void
  commit: () => void
  cancel: () => void
}) {
  const designer = useDesigner()
  let textareaRef: HTMLTextAreaElement | undefined
  const zoom = createMemo(() => designer.view.transform().zoom)
  const [isComposing, setIsComposing] = createSignal(false)
  const [measuredWidth, setMeasuredWidth] = createSignal<number | null>(null)
  const [measuredHeight, setMeasuredHeight] = createSignal<number | null>(null)

  const frame = createMemo(() => {
    const current = props.session()
    if (!current) return null

    const element = designer.getElementById(current.elementId)
    if (!element) return null

    if (current.type === 'shape' && isShape(element)) {
      const box = getShapeTextBox(element)
      if (!box) return null
      const block = element.textBlock[0]
      const fontStyle = block.fontStyle || element.fontStyle
      const screenCenter = designer.view.toScreen({
        x: box.cx,
        y: box.cy,
      })
      const screenWidth = box.w * zoom()
      const screenHeight = box.h * zoom()
      const padding = getVerticalPadding(props.draft(), fontStyle, screenHeight, zoom())

      return {
        kind: 'shape' as const,
        cx: screenCenter.x,
        cy: screenCenter.y,
        x: screenCenter.x - screenWidth / 2,
        y: screenCenter.y - screenHeight / 2,
        w: screenWidth,
        h: screenHeight,
        angle: box.angle,
        fontStyle,
        paddingTop: padding.top,
        paddingBottom: padding.bottom,
      }
    }

    if (current.type === 'linker' && isLinker(element)) {
      const route = designer.view.getLinkerRoute(element)
      if (route.points.length === 0) return null

      const fontStyle = element.fontStyle
      const box = getLinkerTextBox(route, props.draft(), fontStyle, {
        curved: element.linkerType === 'curved',
        textPosition: element.textPosition,
      })
      if (!box) return null

      const bounds = designer.view.toScreen({
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
      })
      const padding = getVerticalPadding(props.draft(), fontStyle, bounds.h, zoom())

      return {
        kind: 'linker' as const,
        cx: bounds.x + bounds.w / 2,
        cy: bounds.y + bounds.h / 2,
        x: bounds.x,
        y: bounds.y,
        w: bounds.w,
        h: bounds.h,
        angle: 0,
        fontStyle,
        paddingTop: padding.top,
        paddingBottom: padding.bottom,
      }
    }

    return null
  })

  const resolvedWidth = createMemo(() => {
    const current = frame()
    if (!current) return null
    if (current.kind === 'shape') return current.w

    const minWidth = current.w
    const maxWidth = Math.max(minWidth, MaxEditorWidth * zoom())
    const nextWidth = Math.max(minWidth, measuredWidth() ?? minWidth)
    return Math.min(nextWidth, maxWidth)
  })

  const resolvedHeight = createMemo(() => {
    const current = frame()
    if (!current) return null

    const minHeight = current.h
    const maxHeight = Math.max(minHeight, MaxEditorHeight * zoom())
    const nextHeight = measuredHeight() ?? minHeight
    return Math.min(Math.max(nextHeight, minHeight), maxHeight)
  })

  const overflowY = createMemo(() => {
    const current = frame()
    const height = resolvedHeight()
    const measured = measuredHeight()
    if (!current || !height || !measured) return 'hidden'
    return measured > height ? 'auto' : 'hidden'
  })

  const textareaStyle = createMemo(() => {
    const current = frame()
    const width = resolvedWidth()
    const height = resolvedHeight()
    if (!current) {
      return {
        display: 'none',
      }
    }

    const finalWidth = width ?? current.w
    const finalHeight = height ?? current.h
    const padding = getVerticalPadding(props.draft(), current.fontStyle, finalHeight, zoom())

    return {
      display: 'block',
      position: 'absolute',
      left: `${current.cx - finalWidth / 2}px`,
      top: `${current.cy - finalHeight / 2}px`,
      width: `${finalWidth}px`,
      height: `${finalHeight}px`,
      'padding-top': `${padding.top}px`,
      'padding-right': `${BasePaddingX}px`,
      'padding-bottom': `${padding.bottom}px`,
      'padding-left': `${BasePaddingX}px`,
      border: '1px solid #067bef',
      'border-radius': '4px',
      'box-sizing': 'border-box',
      'background-color': 'rgba(255,255,255,0.96)',
      color: toCssColor(current.fontStyle.color),
      'caret-color': toCssColor(current.fontStyle.color),
      'font-family': current.fontStyle.fontFamily,
      'font-size': `${(current.fontStyle.size ?? 13) * zoom()}px`,
      'font-weight': current.fontStyle.bold ? '700' : '400',
      'font-style': current.fontStyle.italic ? 'italic' : 'normal',
      'line-height': `${current.fontStyle.lineHeight ?? 1.25}`,
      'text-align': current.fontStyle.textAlign ?? 'center',
      resize: 'none',
      overflow: 'hidden',
      'overflow-y': overflowY(),
      outline: 'none',
      'pointer-events': 'auto',
      'white-space': 'pre-wrap',
      'overflow-wrap': 'break-word',
      transform: current.angle ? `rotate(${current.angle}deg)` : undefined,
      'transform-origin': 'center center',
    } as const
  })

  createEffect(() => {
    const current = props.session()
    if (!current || !textareaRef) return

    queueMicrotask(() => {
      textareaRef?.focus()
      textareaRef?.select()
    })
  })

  createEffect(() => {
    const current = frame()
    props.draft()
    if (!current || !textareaRef) {
      setMeasuredWidth(null)
      setMeasuredHeight(null)
      return
    }

    queueMicrotask(() => {
      const textarea = textareaRef
      if (!textarea) return

      const nextWidth = Math.ceil(textarea.scrollWidth)
      const nextHeight = Math.ceil(textarea.scrollHeight)
      setMeasuredWidth(prev => (prev === nextWidth ? prev : nextWidth))
      setMeasuredHeight(prev => (prev === nextHeight ? prev : nextHeight))
    })
  })

  createEffect(() => {
    if (props.session() && !frame()) {
      props.cancel()
    }
  })

  createEffect(() => {
    if (!props.session()) {
      setIsComposing(false)
      setMeasuredWidth(null)
      setMeasuredHeight(null)
    }
  })

  return (
    <textarea
      ref={textareaRef}
      data-text-editor="true"
      value={props.draft()}
      onInput={event => {
        props.setDraft(event.currentTarget.value)
      }}
      onCompositionStart={() => {
        setIsComposing(true)
      }}
      onCompositionEnd={event => {
        setIsComposing(false)
        props.setDraft(event.currentTarget.value)
      }}
      onKeyDown={event => {
        if (isComposing() || event.isComposing) {
          return
        }

        if (event.key === 'Escape') {
          event.preventDefault()
          event.stopPropagation()
          props.cancel()
          return
        }

        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          event.stopPropagation()
          props.commit()
        }
      }}
      onBlur={() => {
        if (isComposing()) return
        props.commit()
      }}
      style={textareaStyle()}
    />
  )
}

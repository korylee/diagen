import { Schema } from '@diagen/core'
import { Match, Switch } from 'solid-js'
import { LinkerPreviewCanvas } from './LinkerPreviewCanvas'
import { ShapePreviewCanvas } from './ShapePreviewCanvas'

export interface CanvasPreviewProps {
  width: number
  height: number
  accent: string
  padding: number
  showText: boolean
  showMarkers: boolean
  schema: 'linker' | 'shape'
  schemaId: string
  class?: string
}

export function CanvasPreview(props: CanvasPreviewProps) {
  return (
    <Switch>
      <Match when={props.schema === 'shape' && Schema.createShape(props.schemaId, { x: 0, y: 0 })}>
        {resolved => <ShapePreviewCanvas {...props} element={resolved()} />}
      </Match>
      <Match
        when={
          props.schema === 'linker' &&
          Schema.createLinker(
            props.schemaId,
            { x: 0, y: 0, binding: { type: 'free' } },
            { x: 1, y: 0, binding: { type: 'free' } },
          )
        }
      >
        {resolved => <LinkerPreviewCanvas {...props} element={resolved()} />}
      </Match>
    </Switch>
  )
}

import type { JSX } from 'solid-js'
import { Show, type Accessor } from 'solid-js'
import { TextEditorOverlay } from '../controls/textEditor'
import type { TextEditorSession } from '../controls/textEditor'
import { BoxSelectionOverlay } from './BoxSelectionOverlay'
import { GuideOverlay } from './GuideOverlay'
import { LinkerOverlay } from './LinkerOverlay'
import { ShapeSelectionOverlay } from './ShapeSelectionOverlay'

export interface OverlayRootProps {
  style: JSX.CSSProperties
  isEditing: Accessor<boolean>
  session: Accessor<TextEditorSession | null>
  draft: Accessor<string>
  setDraft: (value: string) => void
  commit: () => void
  cancel: () => void
  children?: JSX.Element
}

export function OverlayRoot(props: OverlayRootProps) {
  return (
    <div class="dg-renderer__overlay" style={props.style}>
      <Show when={!props.isEditing()}>
        <BoxSelectionOverlay />
        <GuideOverlay />
        <LinkerOverlay />
        <ShapeSelectionOverlay />
      </Show>

      <Show when={props.session()}>
        <TextEditorOverlay
          session={props.session}
          draft={props.draft}
          setDraft={props.setDraft}
          commit={props.commit}
          cancel={props.cancel}
        />
      </Show>

      {props.children}
    </div>
  )
}

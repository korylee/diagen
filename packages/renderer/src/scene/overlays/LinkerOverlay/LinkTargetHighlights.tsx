import type { RectHighlightItem } from '../RectHighlightOverlay'
import { RectHighlightOverlay } from '../RectHighlightOverlay'

export function LinkTargetHighlights(props: { isLinkEndDragging: boolean; targets: RectHighlightItem[] }) {
  return (
    <>
      <RectHighlightOverlay items={props.targets} visible={props.isLinkEndDragging} zIndex={999} />
    </>
  )
}

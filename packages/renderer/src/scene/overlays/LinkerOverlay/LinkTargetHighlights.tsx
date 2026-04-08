import type { RectHighlightItem } from '../RectHighlightOverlay'
import { RectHighlightOverlay } from '../RectHighlightOverlay'

export function LinkTargetHighlights(props: {
  isLinkEndDragging: boolean
  targetItems: RectHighlightItem[]
  sourceItems: RectHighlightItem[]
}) {
  return (
    <>
      <RectHighlightOverlay items={props.targetItems} visible={props.isLinkEndDragging} zIndex={999} />
      <RectHighlightOverlay items={props.sourceItems} visible={props.sourceItems.length > 0} zIndex={998} />
    </>
  )
}

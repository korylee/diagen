import type { LinkerTextBox as CoreLinkerTextBox } from '@diagen/core'
import type { Point } from '@diagen/shared'

export {
  estimateLinkerTextWidth,
  getLinkerTextAnchor,
  getLinkerTextBox,
} from '@diagen/core'
export type {
  GetLinkerTextAnchorOptions,
  GetLinkerTextBoxOptions,
  LinkerTextBox,
} from '@diagen/core'

export function isPointInLinkerTextBox(point: Point, box: CoreLinkerTextBox): boolean {
  return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h
}

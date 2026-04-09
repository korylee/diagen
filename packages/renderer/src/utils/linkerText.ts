import type { LinkerTextBox as CoreLinkerTextBox } from '@diagen/core/linkerText'
import type { Point } from '@diagen/shared'

export { estimateLinkerTextWidth, getLinkerTextAnchor, getLinkerTextBox } from '@diagen/core/linkerText'
export type { GetLinkerTextAnchorOptions, GetLinkerTextBoxOptions, LinkerTextBox } from '@diagen/core/linkerText'

export function isPointInLinkerTextBox(point: Point, box: CoreLinkerTextBox): boolean {
  return point.x >= box.x && point.x <= box.x + box.w && point.y >= box.y && point.y <= box.y + box.h
}

import type { Point } from '@diagen/shared'
import type { FontStyle, LinkerTextPosition } from '../model'
import type { LinkerRoute } from './router'
import { getRouteCenter } from './router/routeGeometry'

const PadX = 6
const PadY = 4

export interface LinkerTextBox {
  x: number
  y: number
  w: number
  h: number
  cx: number
  cy: number
  lines: string[]
  lineHeight: number
}

export interface GetLinkerTextAnchorOptions {
  curved?: boolean
  textPosition?: LinkerTextPosition
}

export interface GetLinkerTextBoxOptions extends GetLinkerTextAnchorOptions {
  measureText?: (line: string) => number
}

export function getLinkerTextAnchor(
  route: LinkerRoute,
  options: GetLinkerTextAnchorOptions = {},
): Point | null {
  const center = getRouteCenter(route, options.curved === true)
  if (!center) return null

  return {
    x: center.x + (options.textPosition?.dx ?? 0),
    y: center.y + (options.textPosition?.dy ?? 0),
  }
}

export function getLinkerTextBox(
  route: LinkerRoute,
  text: string,
  fontStyle: FontStyle | undefined,
  options: GetLinkerTextBoxOptions = {},
): LinkerTextBox | null {
  if (!text) return null

  const center = getLinkerTextAnchor(route, options)
  if (!center) return null

  const lines = text.split('\n')
  const fontSize = fontStyle?.size || 13
  const lineHeight = fontSize * (fontStyle?.lineHeight || 1.25)
  const contentWidth = Math.max(
    ...lines.map(line => options.measureText?.(line) ?? estimateLinkerTextWidth(line, fontStyle)),
    fontSize,
  )
  const w = contentWidth + PadX * 2
  const h = Math.max(lines.length * lineHeight + PadY * 2, fontSize + PadY * 2)

  return {
    x: center.x - w / 2,
    y: center.y - h / 2,
    w,
    h,
    cx: center.x,
    cy: center.y,
    lines,
    lineHeight,
  }
}

export function estimateLinkerTextWidth(line: string, fontStyle: FontStyle | undefined): number {
  return Math.max(line.length, 1) * (fontStyle?.size || 13) * 0.6
}

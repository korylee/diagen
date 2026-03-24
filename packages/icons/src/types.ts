import type { JSX } from 'solid-js'

export interface IconProps extends Omit<JSX.SvgSVGAttributes<SVGSVGElement>, 'color'> {
  size?: number | string
  color?: string
  strokeWidth?: number
  title?: string
  viewBox?: string
}

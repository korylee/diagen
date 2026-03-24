import type { JSX } from 'solid-js'
import { splitProps } from 'solid-js'

import type { IconProps } from './types'

export function IconBase(props: IconProps & { children: JSX.Element }): JSX.Element {
  const [local, rest] = splitProps(props, ['size', 'color', 'strokeWidth', 'title', 'viewBox', 'children', 'class'])
  const size = local.size ?? 16
  const strokeWidth = local.strokeWidth ?? 1.8

  return (
    <svg
      {...rest}
      class={local.class}
      width={size}
      height={size}
      viewBox={local.viewBox ?? '0 0 16 16'}
      fill="none"
      stroke={local.color ?? 'currentColor'}
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden={local.title ? undefined : 'true'}
      role={local.title ? 'img' : undefined}
    >
      {local.title ? <title>{local.title}</title> : null}
      {local.children}
    </svg>
  )
}

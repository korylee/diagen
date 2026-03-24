import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import { createDgBem, cx, pick, toUnit } from '@diagen/shared'

import './index.css'
import type {
  ToolbarButtonProps,
  ToolbarDividerProps,
  ToolbarLinkProps,
  ToolbarProps,
  ToolbarRightProps,
  ToolbarSpacerProps,
  ToolbarSpinnerProps,
} from './types'

const bem = createDgBem('toolbar')

function mergeStyle(width: number | string | undefined, style: string | undefined) {
  let sty = style ? style.trim() : ''

  const widthValue = toUnit(width)

  if (widthValue) {
    sty = `width:${widthValue};` + sty
  }

  return sty
}

function ToolbarItemContent(props: {
  icon?: JSX.Element
  text?: JSX.Element
  color?: string
  dropdown?: boolean
  children?: JSX.Element
}): JSX.Element {
  return (
    <>
      <Show when={props.icon}>
        <span class={bem('icon')}>{props.icon}</span>
      </Show>
      <Show when={props.text}>
        <span class={bem('text')}>{props.text}</span>
      </Show>
      {props.children}
      <Show when={props.color}>
        <span class={bem('color')} style={props.color ? `background-color:${props.color}` : undefined}></span>
      </Show>
      <Show when={props.dropdown}>
        <span class={bem('caret')} aria-hidden="true"></span>
      </Show>
    </>
  )
}

function resolveItemClass(name: string, props: { class?: string; active?: boolean; selected?: boolean }): string {
  const base = bem(name, { active: props.active, selected: props.selected })
  return cx(base, props.class)
}

export function Toolbar(props: ToolbarProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'style', 'width', 'children'])

  return (
    <div {...rest} class={cx(bem(), local.class)} style={mergeStyle(local.width, local.style)}>
      {local.children}
    </div>
  )
}

export function ToolbarRight(props: ToolbarRightProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'style', 'width', 'children'])

  return (
    <div {...rest} class={cx(bem('right'), local.class)} style={mergeStyle(local.width, local.style)}>
      {local.children}
    </div>
  )
}

export function ToolbarSpacer(props: ToolbarSpacerProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'style'])

  return <div {...rest} class={cx(bem('spacer'), local.class)} style={local.style}></div>
}

export function ToolbarDivider(props: ToolbarDividerProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'style', 'size'])

  return (
    <div
      {...rest}
      class={cx(bem('divider', [local.size === 'small' ? 'small' : undefined]), local.class)}
      style={local.style}
    ></div>
  )
}

export function ToolbarButton(props: ToolbarButtonProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'class',
    'style',
    'width',
    'icon',
    'text',
    'color',
    'dropdown',
    'active',
    'selected',
    'children',
  ])

  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      class={resolveItemClass('button', local)}
      style={mergeStyle(local.width, local.style)}
    >
      <ToolbarItemContent {...pick(local, ['icon', 'text', 'color', 'dropdown'])}>{local.children}</ToolbarItemContent>
    </button>
  )
}

export function ToolbarLink(props: ToolbarLinkProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'class',
    'style',
    'width',
    'icon',
    'text',
    'color',
    'dropdown',
    'active',
    'selected',
    'children',
  ])

  return (
    <a {...rest} class={resolveItemClass('link', local)} style={mergeStyle(local.width, local.style)}>
      <ToolbarItemContent {...pick(local, ['icon', 'text', 'color', 'dropdown'])}>{local.children}</ToolbarItemContent>
    </a>
  )
}

export function ToolbarSpinner(props: ToolbarSpinnerProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'style', 'width', 'value', 'children'])

  return (
    <div {...rest} class={cx(bem('spinner'), local.class)} style={mergeStyle(local.width, local.style)}>
      <Show when={local.value}>
        <span class={bem('text')}>{local.value}</span>
      </Show>
      {local.children}
    </div>
  )
}

export type {
  ToolbarButtonProps,
  ToolbarDividerProps,
  ToolbarLinkProps,
  ToolbarProps,
  ToolbarRightProps,
  ToolbarSharedProps,
  ToolbarSpacerProps,
  ToolbarSpinnerProps,
} from './types'

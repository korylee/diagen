import type { JSX } from 'solid-js'
import { Show, splitProps } from 'solid-js'

import { createDgBem, cx, pick, toUnit } from '@diagen/shared'

import './index.css'
import type {
  ActionBarButtonProps,
  ActionBarDividerProps,
  ActionBarFieldProps,
  ActionBarLinkProps,
  ActionBarProps,
  ActionBarSpacerProps,
} from './types'

const bem = createDgBem('action-bar')

function mergeStyle(width: number | string | undefined, style: string | undefined): string {
  let resolvedStyle = style ? style.trim() : ''
  const widthValue = toUnit(width)

  if (widthValue) {
    resolvedStyle = `width:${widthValue};${resolvedStyle}`
  }

  return resolvedStyle
}

function ActionBarItemContent(props: {
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
  return cx(bem(name, { active: props.active, selected: props.selected }), props.class)
}

export function ActionBar(props: ActionBarProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'style', 'width', 'children'])

  return (
    <div {...rest} class={cx(bem(), local.class)} style={mergeStyle(local.width, local.style)}>
      {local.children}
    </div>
  )
}

export function ActionBarSpacer(props: ActionBarSpacerProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'style'])
  return <div {...rest} class={cx(bem('spacer'), local.class)} style={local.style}></div>
}

export function ActionBarDivider(props: ActionBarDividerProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'style', 'size'])

  return (
    <div
      {...rest}
      class={cx(bem('divider', [local.size === 'small' ? 'small' : undefined]), local.class)}
      style={local.style}
    ></div>
  )
}

export function ActionBarButton(props: ActionBarButtonProps): JSX.Element {
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
      <ActionBarItemContent {...pick(local, ['icon', 'text', 'color', 'dropdown'])}>
        {local.children}
      </ActionBarItemContent>
    </button>
  )
}

export function ActionBarLink(props: ActionBarLinkProps): JSX.Element {
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
      <ActionBarItemContent {...pick(local, ['icon', 'text', 'color', 'dropdown'])}>
        {local.children}
      </ActionBarItemContent>
    </a>
  )
}

export function ActionBarField(props: ActionBarFieldProps): JSX.Element {
  const [local, rest] = splitProps(props, ['class', 'style', 'width', 'value', 'children'])

  return (
    <div {...rest} class={cx(bem('field'), local.class)} style={mergeStyle(local.width, local.style)}>
      <Show when={local.value}>
        <span class={bem('text')}>{local.value}</span>
      </Show>
      {local.children}
    </div>
  )
}

export * from './types'

import { For, Show, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'

import { createIconRegistry, renderIcon, type IconRegistryOverrides } from '../iconRegistry'
import { createToolbarBridge } from './createToolbarBridge'
import type { ToolbarBridgeItem, ToolbarEntries, ToolbarItem } from './types'
import { createDgBem, cx, pick, toUnit } from '@diagen/shared'

import './index.css'

const bem = createDgBem('toolbar')

function mergeStyle(width: number | string | undefined, style: string | undefined): string {
  let resolvedStyle = style ? style.trim() : ''
  const widthValue = toUnit(width)

  if (widthValue) {
    resolvedStyle = `width:${widthValue};${resolvedStyle}`
  }

  return resolvedStyle
}

function ToolbarItemContent(props: {
  icon?: JSX.Element
  text?: JSX.Element
  color?: string
  dropdown?: boolean
}): JSX.Element {
  return (
    <>
      <Show when={props.icon}>
        <span class={bem('icon')}>{props.icon}</span>
      </Show>
      <Show when={props.text}>
        <span class={bem('text')}>{props.text}</span>
      </Show>
      <Show when={props.color}>
        <span class={bem('color')} style={props.color ? `background-color:${props.color}` : undefined}></span>
      </Show>
      <Show when={props.dropdown}>
        <span class={bem('caret')} aria-hidden="true"></span>
      </Show>
    </>
  )
}

function resolveButtonClass(props: { class?: string; active?: boolean; selected?: boolean }): string {
  return cx(bem('button', { active: props.active, selected: props.selected }), props.class)
}

function ToolbarDivider() {
  return <div class={bem('divider')}></div>
}

function ToolbarSpacer() {
  return <div class={bem('spacer')}></div>
}

function ToolbarButton(
  props: {
    class?: string
    style?: string
    width?: number | string
    icon?: JSX.Element
    text?: JSX.Element
    color?: string
    dropdown?: boolean
    active?: boolean
    selected?: boolean
  } & Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, 'class' | 'style' | 'children'>,
): JSX.Element {
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
  ])

  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      class={resolveButtonClass(local)}
      style={mergeStyle(local.width, local.style)}
    >
      <ToolbarItemContent {...pick(local, ['icon', 'text', 'color', 'dropdown'])} />
    </button>
  )
}

export interface ToolbarProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'style'> {
  class?: string
  style?: string
  width?: number | string
  rightSlot?: JSX.Element
  iconRegistry?: IconRegistryOverrides
  entries?: ToolbarEntries
  renderIcon?: (icon: ToolbarItem['icon'], item: ToolbarItem) => JSX.Element | undefined
}

function ToolbarBridgeItemView(props: {
  item: ToolbarBridgeItem
  renderIcon: NonNullable<ToolbarProps['renderIcon']>
}) {
  if (props.item === '|') {
    return <ToolbarDivider />
  }

  const button = props.item

  return (
    <ToolbarButton
      {...pick(button, ['title', 'color', 'dropdown', 'active', 'selected', 'width'])}
      text={button.text ?? button.label}
      disabled={button.isDisabled?.()}
      icon={props.renderIcon(button.icon, button)}
      onClick={() => {
        button.execute?.()
      }}
    />
  )
}

export function Toolbar(props: ToolbarProps) {
  const [local, rest] = splitProps(props, ['class', 'style', 'width', 'rightSlot', 'renderIcon', 'iconRegistry', 'entries'])
  const bridge = createToolbarBridge(local.entries)
  const iconRegistry = createIconRegistry(local.iconRegistry)
  const renderToolbarIcon: ToolbarProps['renderIcon'] = (iconKey, item) => {
    return local.renderIcon
      ? local.renderIcon(iconKey, item)
      : typeof iconKey === 'string'
        ? (renderIcon(iconKey as any, iconRegistry, { size: 16 }) ?? <span>•</span>)
        : iconKey?.({ size: 16 })
  }

  return (
    <div
      {...rest}
      role={rest.role ?? 'toolbar'}
      class={cx(bem(), local.class)}
      style={mergeStyle(local.width, local.style)}
      aria-label={rest['aria-label'] ?? 'Toolbar'}
    >
      <For each={bridge.leftItems()}>
        {item => <ToolbarBridgeItemView item={item} renderIcon={renderToolbarIcon} />}
      </For>
      <Show when={bridge.rightItems().length > 0 || local.rightSlot}>
        <ToolbarSpacer />
        <For each={bridge.rightItems()}>
          {item => <ToolbarBridgeItemView item={item} renderIcon={renderToolbarIcon} />}
        </For>
        {local.rightSlot}
      </Show>
    </div>
  )
}

import type { JSX } from 'solid-js'
import { For, Match, Show, splitProps, Switch } from 'solid-js'

import { createDgBem, cx, toUnit } from '@diagen/shared'
import { useUIIconRegistry } from '../config'
import { renderIcon } from '../iconRegistry'
import { createToolbarBridge } from './createToolbarBridge'
import type { ToolbarEntries, ToolbarItem } from './types'

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
      class={cx(bem('button', { active: local.active, selected: local.selected }), local.class)}
      style={mergeStyle(local.width, local.style)}
    >
      <Show when={local.icon}>
        <span class={bem('icon')}>{local.icon}</span>
      </Show>
      <Show when={local.text}>
        <span class={bem('text')}>{local.text}</span>
      </Show>
      <Show when={local.color}>
        <span class={bem('color')} style={local.color ? `background-color:${local.color}` : undefined}></span>
      </Show>
      <Show when={local.dropdown}>
        <span class={bem('caret')} aria-hidden="true"></span>
      </Show>
    </button>
  )
}

export interface ToolbarProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children' | 'class' | 'style'> {
  class?: string
  style?: string
  width?: number | string
  endSlot?: JSX.Element
  entries?: ToolbarEntries
  renderIcon?: (icon: ToolbarItem['icon'], item: ToolbarItem) => JSX.Element | undefined
}

export function Toolbar(props: ToolbarProps) {
  const [local, rest] = splitProps(props, ['class', 'style', 'width', 'endSlot', 'renderIcon', 'entries'])
  const bridge = createToolbarBridge(local.entries)
  const iconRegistry = useUIIconRegistry()
  const renderToolbarIcon: ToolbarProps['renderIcon'] = (iconKey, item) => {
    return local.renderIcon
      ? local.renderIcon(iconKey, item)
      : typeof iconKey === 'string'
        ? (renderIcon(iconKey as any, iconRegistry(), { size: 16 }) ?? <span>•</span>)
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
      <For each={bridge.items()}>
        {item => (
          <Switch>
            <Match when={item === '|'}>
              <ToolbarDivider />
            </Match>
            <Match when={item === 'spacer'}>
              <ToolbarSpacer />
            </Match>
            <Match when={item as ToolbarItem}>
              {buttonAccessor => {
                const button = buttonAccessor()
                const [buttonProps, rest] = splitProps(button, [
                  'title',
                  'color',
                  'dropdown',
                  'active',
                  'selected',
                  'width',
                ])
                return (
                  <ToolbarButton
                    {...buttonProps}
                    text={rest.text ?? rest.label}
                    disabled={rest.isDisabled?.()}
                    icon={renderToolbarIcon(rest.icon, button)}
                    onClick={() => {
                      rest.execute?.()
                    }}
                  />
                )
              }}
            </Match>
          </Switch>
        )}
      </For>
      <Show when={local.endSlot}>
        <ToolbarSpacer />
        {local.endSlot}
      </Show>
    </div>
  )
}

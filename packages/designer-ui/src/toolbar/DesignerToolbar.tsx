import { For, Match, Show, Switch, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'
import type { Designer } from '@diagen/core'
import { Toolbar, ToolbarButton, ToolbarDivider, ToolbarRight, ToolbarSpacer } from '@diagen/ui'
import type { ToolbarProps } from '@diagen/ui'

import {
  createDesignerIconRegistry,
  renderDesignerIcon,
  type DesignerIconRegistryOverrides,
} from '../designerIconRegistry'
import { createToolbarBridge } from './createToolbarBridge'
import type { ToolbarBridgeButtonItem, ToolbarBridgeItem } from './types'
import { pick } from '@diagen/shared'

export interface DesignerToolbarProps extends Omit<ToolbarProps, 'children'> {
  designer: Designer
  rightSlot?: JSX.Element
  iconRegistry?: DesignerIconRegistryOverrides
  renderIcon?: (iconKey: ToolbarBridgeButtonItem['iconKey'], item: ToolbarBridgeButtonItem) => JSX.Element
}

function ToolbarBridgeItemView(props: {
  item: ToolbarBridgeItem
  renderIcon: NonNullable<DesignerToolbarProps['renderIcon']>
}) {
  return (
    <Switch>
      <Match when={props.item.kind === 'button' ? props.item : false}>
        {button => (
          <ToolbarButton
            {...pick(button(), ['title', 'text', 'color', 'dropdown', 'disabled', 'active', 'selected', 'width'])}
            icon={props.renderIcon(button().iconKey, button())}
            onClick={() => {
              button().execute()
            }}
          />
        )}
      </Match>
      <Match when={props.item.kind === 'divider' ? props.item : false}>
        {divider => <ToolbarDivider size={divider().size} />}
      </Match>
      <Match when={props.item.kind === 'spacer'}>
        <ToolbarSpacer />
      </Match>
    </Switch>
  )
}

export function DesignerToolbar(props: DesignerToolbarProps) {
  const [local, rest] = splitProps(props, [
    'designer',
    'rightSlot',
    'renderIcon',
    'iconRegistry',
    'class',
    'style',
    'width',
  ])
  const bridge = createToolbarBridge(local.designer)
  const iconRegistry = createDesignerIconRegistry(local.iconRegistry)
  const renderToolbarIcon: DesignerToolbarProps['renderIcon'] = (iconKey, item) => {
    return local.renderIcon
      ? local.renderIcon(iconKey, item)
      : (renderDesignerIcon(iconKey, iconRegistry, { size: 16 }) ?? <span>•</span>)
  }

  return (
    <Toolbar
      {...rest}
      class={local.class}
      style={local.style}
      width={local.width}
      aria-label={rest['aria-label'] ?? 'Designer Toolbar'}
    >
      <For each={bridge.leftItems()}>
        {item => <ToolbarBridgeItemView item={item} renderIcon={renderToolbarIcon} />}
      </For>
      <Show when={bridge.rightItems().length > 0 || local.rightSlot}>
        <ToolbarRight>
          <For each={bridge.rightItems()}>
            {item => <ToolbarBridgeItemView item={item} renderIcon={renderToolbarIcon} />}
          </For>
          {local.rightSlot}
        </ToolbarRight>
      </Show>
    </Toolbar>
  )
}

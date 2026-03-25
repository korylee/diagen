import { For, Match, Show, Switch, splitProps } from 'solid-js'
import type { JSX } from 'solid-js'
import type { Designer } from '@diagen/core'
import { ActionBar, ActionBarButton, ActionBarDivider, ActionBarSpacer } from '@diagen/ui'
import type { ActionBarProps } from '@diagen/ui'

import { createIconRegistry, renderIcon, type IconRegistryOverrides } from '../designerIconRegistry'
import { createToolbarBridge } from './createToolbarBridge'
import type { ToolbarBridgeButtonItem, ToolbarBridgeItem } from './types'
import { pick } from '@diagen/shared'

export interface ToolbarProps extends Omit<ActionBarProps, 'children'> {
  designer: Designer
  rightSlot?: JSX.Element
  iconRegistry?: IconRegistryOverrides
  renderIcon?: (iconKey: ToolbarBridgeButtonItem['iconKey'], item: ToolbarBridgeButtonItem) => JSX.Element
}

function ToolbarBridgeItemView(props: {
  item: ToolbarBridgeItem
  renderIcon: NonNullable<ToolbarProps['renderIcon']>
}) {
  return (
    <Switch>
      <Match when={props.item.kind === 'button' ? props.item : false}>
        {button => (
          <ActionBarButton
            {...pick(button(), ['title', 'text', 'color', 'dropdown', 'disabled', 'active', 'selected', 'width'])}
            icon={props.renderIcon(button().iconKey, button())}
            onClick={() => {
              button().execute()
            }}
          />
        )}
      </Match>
      <Match when={props.item.kind === 'divider' ? props.item : false}>
        {divider => <ActionBarDivider size={divider().size} />}
      </Match>
      <Match when={props.item.kind === 'spacer'}>
        <ActionBarSpacer />
      </Match>
    </Switch>
  )
}

export function Toolbar(props: ToolbarProps) {
  const [local, rest] = splitProps(props, ['designer', 'rightSlot', 'renderIcon', 'iconRegistry'])
  const bridge = createToolbarBridge(local.designer)
  const iconRegistry = createIconRegistry(local.iconRegistry)
  const renderToolbarIcon: ToolbarProps['renderIcon'] = (iconKey, item) => {
    return local.renderIcon
      ? local.renderIcon(iconKey, item)
      : (renderIcon(iconKey, iconRegistry, { size: 16 }) ?? <span>•</span>)
  }

  return (
    <ActionBar {...rest} aria-label={rest['aria-label'] ?? 'Toolbar'}>
      <For each={bridge.leftItems()}>
        {item => <ToolbarBridgeItemView item={item} renderIcon={renderToolbarIcon} />}
      </For>
      <Show when={bridge.rightItems().length > 0 || local.rightSlot}>
        <ActionBarSpacer />
        <For each={bridge.rightItems()}>
          {item => <ToolbarBridgeItemView item={item} renderIcon={renderToolbarIcon} />}
        </For>
        {local.rightSlot}
      </Show>
    </ActionBar>
  )
}

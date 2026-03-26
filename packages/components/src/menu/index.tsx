import type { JSX } from 'solid-js'
import { createEffect, createMemo, createSignal, For, Show, splitProps } from 'solid-js'

import { createDgBem, cx } from '@diagen/shared'

import './index.css'
import type {
  MenuClickInfo,
  MenuDataAttributeValue,
  MenuDataAttributes,
  MenuDataItem,
  MenuItemGroupType,
  MenuItemType,
  MenuMode,
  MenuProps,
  MenuSelectInfo,
  MenuSubMenuType,
  MenuTheme,
  MenuTriggerSubMenuAction,
} from './types'
import {
  getMenuAncestorKeys,
  getMenuDescendantSubMenuKeys,
  hasMenuSelectedDescendant,
  isMenuDivider,
  isMenuGroup,
  isMenuSubMenu,
  uniqueMenuKeys,
} from './utils'

export * from './types'

const bem = createDgBem('menu')

interface MenuListProps {
  items: readonly MenuDataItem[]
  level: number
  role: 'group' | 'menu' | 'menubar'
  mode: MenuMode
  inlineIndent: number
  selectedKeys: readonly string[]
  openKeys: readonly string[]
  triggerSubMenuAction: MenuTriggerSubMenuAction
  onItemActivate: (item: MenuItemType, event: MouseEvent, parentKeys: readonly string[]) => void
  onSubMenuToggle: (item: MenuSubMenuType, nextOpen: boolean) => void
  parentKeys: readonly string[]
}

interface MenuNodeProps extends Omit<MenuListProps, 'items' | 'role'> {
  item: Exclude<MenuDataItem, null>
}

function mergeStyle(...styles: readonly (string | undefined)[]): string | undefined {
  const merged = styles
    .map(style => style?.trim())
    .filter((style): style is string => Boolean(style && style.length > 0))
    .join(';')

  return merged.length > 0 ? merged : undefined
}

function areMenuKeysEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) {
    return false
  }

  return left.every((key, index) => key === right[index])
}

function resolveItemStyle(mode: MenuMode, level: number, inlineIndent: number, style?: string): string | undefined {
  return mergeStyle(
    style,
    `--dg-menu-depth:${level}`,
    mode === 'inline' ? `--dg-menu-inline-indent:${inlineIndent}px` : undefined,
  )
}

function resolveMenuRole(mode: MenuMode): 'menu' | 'menubar' {
  return mode === 'horizontal' ? 'menubar' : 'menu'
}

function resolveMenuTheme(theme: MenuTheme | undefined): MenuTheme {
  return theme ?? 'light'
}

function resolveMenuMode(mode: MenuMode | undefined): MenuMode {
  return mode ?? 'vertical'
}

function resolveMenuItems(items: readonly MenuDataItem[] | undefined): readonly Exclude<MenuDataItem, null>[] {
  return (items ?? []).filter((item): item is Exclude<MenuDataItem, null> => item !== null)
}

function collectSelectedAncestorKeys(
  items: readonly MenuDataItem[],
  selectedKeys: readonly string[],
): readonly string[] {
  return uniqueMenuKeys(selectedKeys.flatMap(key => getMenuAncestorKeys(items, key)))
}

function pickDataAttributes(item: MenuDataAttributes): Record<string, MenuDataAttributeValue> {
  const dataAttributes: Record<string, MenuDataAttributeValue> = {}

  Object.keys(item).forEach(key => {
    if (!key.startsWith('data-')) {
      return
    }

    dataAttributes[key] = item[key as keyof MenuDataAttributes]
  })

  return dataAttributes
}

function MenuContent(props: {
  icon?: JSX.Element
  label?: JSX.Element
  extra?: JSX.Element
  caret?: boolean
}): JSX.Element {
  return (
    <>
      <Show when={props.icon}>
        <span class={bem('icon')} aria-hidden="true">
          {props.icon}
        </span>
      </Show>
      <Show when={props.label}>
        <span class={bem('label')}>{props.label}</span>
      </Show>
      <Show when={props.extra}>
        <span class={bem('extra')}>{props.extra}</span>
      </Show>
      <Show when={props.caret}>
        <span class={bem('caret')} aria-hidden="true"></span>
      </Show>
    </>
  )
}

function MenuList(props: MenuListProps): JSX.Element {
  return (
    <ul class={bem('list')} role={props.role} data-level={props.level}>
      <For each={resolveMenuItems(props.items)}>{item => <MenuNode {...props} item={item} />}</For>
    </ul>
  )
}

function MenuNode(props: MenuNodeProps): JSX.Element {
  if (isMenuDivider(props.item)) {
    return (
      <li
        class={cx(bem('divider', { dashed: props.item.dashed }), props.item.class)}
        role="separator"
        {...pickDataAttributes(props.item)}
      ></li>
    )
  }

  if (isMenuGroup(props.item)) {
    return <MenuGroupNode {...props} item={props.item} />
  }

  if (isMenuSubMenu(props.item)) {
    return <MenuSubMenuNode {...props} item={props.item} />
  }

  return <MenuItemNode {...props} item={props.item} />
}

function MenuGroupNode(props: Omit<MenuNodeProps, 'item'> & { item: MenuItemGroupType }): JSX.Element {
  return (
    <li
      class={cx(bem('group'), props.item.class)}
      role="presentation"
      style={resolveItemStyle(props.mode, props.level, props.inlineIndent, props.item.style)}
      {...pickDataAttributes(props.item)}
    >
      <Show when={props.item.label}>
        <span class={bem('group-label')}>{props.item.label}</span>
      </Show>
      <Show when={(props.item.children?.length ?? 0) > 0}>
        <ul class={bem('group-list')} role="group">
          <For each={resolveMenuItems(props.item.children)}>{item => <MenuNode {...props} item={item} />}</For>
        </ul>
      </Show>
    </li>
  )
}

function MenuItemNode(props: Omit<MenuNodeProps, 'item'> & { item: MenuItemType }): JSX.Element {
  const isSelected = (): boolean => props.selectedKeys.includes(props.item.key)
  const isDisabled = (): boolean => Boolean(props.item.disabled)
  const dataAttributes = () => pickDataAttributes(props.item)
  const itemStyle = (): string | undefined =>
    resolveItemStyle(props.mode, props.level, props.inlineIndent, props.item.style)

  const handleClick: JSX.EventHandlerUnion<HTMLAnchorElement | HTMLButtonElement, MouseEvent> = event => {
    if (isDisabled()) {
      event.preventDefault()
      return
    }

    props.onItemActivate(props.item, event, props.parentKeys)
  }

  return (
    <li
      class={cx(bem('item'), props.item.class)}
      role="none"
      data-selected={isSelected() ? 'true' : undefined}
      data-disabled={isDisabled() ? 'true' : undefined}
      data-danger={props.item.danger ? 'true' : undefined}
      {...dataAttributes()}
    >
      <Show
        when={props.item.href}
        fallback={
          <button
            type="button"
            class={bem('button')}
            role="menuitem"
            title={props.item.title}
            disabled={isDisabled()}
            style={itemStyle()}
            onClick={handleClick}
          >
            <MenuContent icon={props.item.icon} label={props.item.label} extra={props.item.extra} />
          </button>
        }
      >
        <a
          class={bem('link')}
          role="menuitem"
          href={props.item.href}
          target={props.item.target}
          rel={props.item.rel}
          title={props.item.title}
          aria-disabled={isDisabled()}
          style={itemStyle()}
          onClick={handleClick}
        >
          <MenuContent icon={props.item.icon} label={props.item.label} extra={props.item.extra} />
        </a>
      </Show>
    </li>
  )
}

function MenuSubMenuNode(props: Omit<MenuNodeProps, 'item'> & { item: MenuSubMenuType }): JSX.Element {
  const isOpen = (): boolean => props.openKeys.includes(props.item.key)
  const isDisabled = (): boolean => Boolean(props.item.disabled)
  const isSelected = (): boolean => hasMenuSelectedDescendant(props.item.children, props.selectedKeys)
  const popupThemeClass = (): string | undefined =>
    props.item.theme ? bem('popup', { [props.item.theme]: true }) : undefined

  const handleToggle = (event: MouseEvent): void => {
    if (isDisabled()) {
      return
    }

    props.onSubMenuToggle(props.item, !isOpen())
    props.item.onTitleClick?.({
      key: props.item.key,
      domEvent: event,
    })
  }

  const shouldUseHover = (): boolean => props.mode !== 'inline' && props.triggerSubMenuAction === 'hover'

  return (
    <li
      class={cx(bem('submenu'), props.item.class)}
      role="none"
      data-open={isOpen() ? 'true' : undefined}
      data-selected={isSelected() ? 'true' : undefined}
      data-disabled={isDisabled() ? 'true' : undefined}
      onMouseEnter={() => {
        if (!shouldUseHover() || isDisabled()) {
          return
        }

        props.onSubMenuToggle(props.item, true)
      }}
      onMouseLeave={() => {
        if (!shouldUseHover() || isDisabled()) {
          return
        }

        props.onSubMenuToggle(props.item, false)
      }}
      {...pickDataAttributes(props.item)}
    >
      <button
        type="button"
        class={bem('submenu-trigger')}
        role="menuitem"
        title={props.item.title}
        aria-haspopup="menu"
        aria-expanded={isOpen()}
        disabled={isDisabled()}
        style={resolveItemStyle(props.mode, props.level, props.inlineIndent, props.item.style)}
        onClick={event => handleToggle(event)}
      >
        <MenuContent icon={props.item.icon} label={props.item.label} caret />
      </button>

      <Show when={isOpen()}>
        <div class={cx(bem('popup'), popupThemeClass())}>
          <MenuList
            items={props.item.children}
            level={props.level + 1}
            role="menu"
            mode={props.mode}
            inlineIndent={props.inlineIndent}
            selectedKeys={props.selectedKeys}
            openKeys={props.openKeys}
            triggerSubMenuAction={props.triggerSubMenuAction}
            parentKeys={[props.item.key, ...props.parentKeys]}
            onItemActivate={props.onItemActivate}
            onSubMenuToggle={props.onSubMenuToggle}
          />
        </div>
      </Show>
    </li>
  )
}

export function Menu(props: MenuProps): JSX.Element {
  const [local, rest] = splitProps(props, [
    'class',
    'style',
    'items',
    'mode',
    'theme',
    'inlineIndent',
    'selectable',
    'multiple',
    'defaultSelectedKeys',
    'selectedKeys',
    'defaultOpenKeys',
    'openKeys',
    'triggerSubMenuAction',
    'onClick',
    'onSelect',
    'onDeselect',
    'onOpenChange',
  ])

  const resolvedMode = createMemo<MenuMode>(() => resolveMenuMode(local.mode))
  const resolvedTheme = createMemo<MenuTheme>(() => resolveMenuTheme(local.theme))
  const resolvedItems = createMemo<readonly MenuDataItem[]>(() => local.items ?? [])
  const inlineIndent = createMemo<number>(() => local.inlineIndent ?? 24)
  const selectable = createMemo<boolean>(() => local.selectable !== false)
  const multiple = createMemo<boolean>(() => Boolean(local.multiple))
  const triggerSubMenuAction = createMemo<MenuTriggerSubMenuAction>(() => local.triggerSubMenuAction ?? 'hover')

  const [innerSelectedKeys, setInnerSelectedKeys] = createSignal<readonly string[]>(local.defaultSelectedKeys ?? [])
  const [innerOpenKeys, setInnerOpenKeys] = createSignal<readonly string[]>(
    uniqueMenuKeys([
      ...(local.defaultOpenKeys ?? []),
      ...collectSelectedAncestorKeys(
        resolveMenuItems(local.items),
        local.selectedKeys ?? local.defaultSelectedKeys ?? [],
      ),
    ]),
  )

  const resolvedSelectedKeys = createMemo<readonly string[]>(() => local.selectedKeys ?? innerSelectedKeys())
  const resolvedOpenKeys = createMemo<readonly string[]>(() => local.openKeys ?? innerOpenKeys())

  createEffect(() => {
    if (local.openKeys !== undefined) {
      return
    }

    const ancestorKeys = collectSelectedAncestorKeys(resolveMenuItems(resolvedItems()), resolvedSelectedKeys())
    if (ancestorKeys.length === 0) {
      return
    }

    const mergedKeys = uniqueMenuKeys([...innerOpenKeys(), ...ancestorKeys])
    if (areMenuKeysEqual(mergedKeys, innerOpenKeys())) {
      return
    }

    setInnerOpenKeys(mergedKeys)
  })

  const commitOpenKeys = (nextKeys: readonly string[]): void => {
    const uniqueKeys = uniqueMenuKeys(nextKeys)

    if (local.openKeys === undefined) {
      setInnerOpenKeys(uniqueKeys)
    }

    local.onOpenChange?.(uniqueKeys)
  }

  const handleSubMenuToggle = (item: MenuSubMenuType, nextOpen: boolean): void => {
    const currentKeys = resolvedOpenKeys()
    const descendantKeys = new Set<string>(getMenuDescendantSubMenuKeys(item))
    const nextKeys = nextOpen
      ? uniqueMenuKeys([...currentKeys, item.key])
      : currentKeys.filter(key => key !== item.key && !descendantKeys.has(key))

    if (areMenuKeysEqual(nextKeys, currentKeys)) {
      return
    }

    commitOpenKeys(nextKeys)
  }

  const handleItemActivate = (item: MenuItemType, event: MouseEvent, parentKeys: readonly string[]): void => {
    const keyPath = [item.key, ...parentKeys]
    const clickInfo: MenuClickInfo = {
      key: item.key,
      keyPath,
      item,
      domEvent: event,
    }

    local.onClick?.(clickInfo)
    item.onClick?.(clickInfo)

    if (!selectable()) {
      return
    }

    const currentSelectedKeys = resolvedSelectedKeys()
    const isSelected = currentSelectedKeys.includes(item.key)

    if (multiple()) {
      const nextSelectedKeys = isSelected
        ? currentSelectedKeys.filter(key => key !== item.key)
        : uniqueMenuKeys([...currentSelectedKeys, item.key])

      if (local.selectedKeys === undefined) {
        setInnerSelectedKeys(nextSelectedKeys)
      }

      const selectInfo: MenuSelectInfo = {
        ...clickInfo,
        selectedKeys: nextSelectedKeys,
      }

      if (isSelected) {
        local.onDeselect?.(selectInfo)
      } else {
        local.onSelect?.(selectInfo)
      }

      return
    }

    const nextSelectedKeys = [item.key]

    if (local.selectedKeys === undefined) {
      setInnerSelectedKeys(nextSelectedKeys)
    }

    local.onSelect?.({
      ...clickInfo,
      selectedKeys: nextSelectedKeys,
    })

    const ancestorKeys = collectSelectedAncestorKeys(resolveMenuItems(resolvedItems()), nextSelectedKeys)
    if (ancestorKeys.length > 0 && local.openKeys === undefined) {
      const mergedOpenKeys = uniqueMenuKeys([...resolvedOpenKeys(), ...ancestorKeys])
      if (!areMenuKeysEqual(mergedOpenKeys, resolvedOpenKeys())) {
        commitOpenKeys(mergedOpenKeys)
      }
    }
  }

  return (
    <nav
      {...rest}
      class={cx(
        bem({
          [resolvedMode()]: true,
          [resolvedTheme()]: true,
        }),
        local.class,
      )}
      style={local.style}
      data-mode={resolvedMode()}
      data-theme={resolvedTheme()}
    >
      <MenuList
        items={resolvedItems()}
        level={0}
        role={resolveMenuRole(resolvedMode())}
        mode={resolvedMode()}
        inlineIndent={inlineIndent()}
        selectedKeys={resolvedSelectedKeys()}
        openKeys={resolvedOpenKeys()}
        triggerSubMenuAction={triggerSubMenuAction()}
        parentKeys={[]}
        onItemActivate={handleItemActivate}
        onSubMenuToggle={handleSubMenuToggle}
      />
    </nav>
  )
}

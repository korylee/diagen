import type { MenuDataItem, MenuDividerType, MenuItemGroupType, MenuItemType, MenuSubMenuType } from './types'

export function isMenuDivider(item: MenuDataItem): item is MenuDividerType {
  return Boolean(item && 'type' in item && item.type === 'divider')
}

export function isMenuGroup(item: MenuDataItem): item is MenuItemGroupType {
  return Boolean(item && 'type' in item && item.type === 'group')
}

export function isMenuSubMenu(item: MenuDataItem): item is MenuSubMenuType {
  return Boolean(
    item && !isMenuDivider(item) && !isMenuGroup(item) && 'children' in item && Array.isArray(item.children),
  )
}

export function isMenuItem(item: MenuDataItem): item is MenuItemType {
  return Boolean(item && !isMenuDivider(item) && !isMenuGroup(item) && !isMenuSubMenu(item))
}

export function findMenuItemByKey(items: readonly MenuDataItem[] | undefined, key: string): MenuDataItem | undefined {
  if (!items) {
    return undefined
  }

  for (const item of items) {
    if (!item) {
      continue
    }

    if ('key' in item && item.key === key) {
      return item
    }

    if (isMenuSubMenu(item) || isMenuGroup(item)) {
      const matched = findMenuItemByKey(item.children, key)
      if (matched) {
        return matched
      }
    }
  }

  return undefined
}

export function findMenuKeyPath(
  items: readonly MenuDataItem[] | undefined,
  key: string,
  parentKeys: readonly string[] = [],
): readonly string[] | undefined {
  if (!items) {
    return undefined
  }

  for (const item of items) {
    if (!item) {
      continue
    }

    if (isMenuDivider(item)) {
      continue
    }

    if (isMenuGroup(item)) {
      const nestedPath = findMenuKeyPath(item.children, key, parentKeys)
      if (nestedPath) {
        return nestedPath
      }
      continue
    }

    if (item.key === key) {
      return [item.key, ...parentKeys]
    }

    if (isMenuSubMenu(item)) {
      const nestedPath = findMenuKeyPath(item.children, key, [item.key, ...parentKeys])
      if (nestedPath) {
        return nestedPath
      }
    }
  }

  return undefined
}

export function getMenuAncestorKeys(items: readonly MenuDataItem[] | undefined, key: string): readonly string[] {
  const keyPath = findMenuKeyPath(items, key)
  return keyPath ? keyPath.slice(1) : []
}

export function getMenuSubMenuKeys(items: readonly MenuDataItem[] | undefined): readonly string[] {
  if (!items) {
    return []
  }

  const keys: string[] = []

  for (const item of items) {
    if (!item) {
      continue
    }

    if (isMenuSubMenu(item)) {
      keys.push(item.key, ...getMenuSubMenuKeys(item.children))
    } else if (isMenuGroup(item)) {
      keys.push(...getMenuSubMenuKeys(item.children))
    }
  }

  return keys
}

export function getMenuDescendantSubMenuKeys(item: MenuDataItem): readonly string[] {
  if (!item) {
    return []
  }

  if (isMenuGroup(item)) {
    return getMenuSubMenuKeys(item.children)
  }

  if (!isMenuSubMenu(item)) {
    return []
  }

  const descendantKeys: string[] = []

  for (const child of item.children) {
    if (!child) {
      continue
    }

    if (isMenuSubMenu(child)) {
      descendantKeys.push(child.key, ...getMenuDescendantSubMenuKeys(child))
    } else if (isMenuGroup(child)) {
      descendantKeys.push(...getMenuSubMenuKeys(child.children))
    }
  }

  return descendantKeys
}

export function hasMenuSelectedDescendant(
  items: readonly MenuDataItem[] | undefined,
  selectedKeys: readonly string[],
): boolean {
  if (!items || selectedKeys.length === 0) {
    return false
  }

  const selectedKeySet = new Set<string>(selectedKeys)

  const traverse = (nodes: readonly MenuDataItem[] | undefined): boolean => {
    if (!nodes) {
      return false
    }

    for (const item of nodes) {
      if (!item || isMenuDivider(item)) {
        continue
      }

      if ('key' in item && item.key && selectedKeySet.has(item.key)) {
        return true
      }

      if ((isMenuSubMenu(item) || isMenuGroup(item)) && traverse(item.children)) {
        return true
      }
    }

    return false
  }

  return traverse(items)
}

export function uniqueMenuKeys(keys: readonly string[]): readonly string[] {
  const visited = new Set<string>()
  const uniqueKeys: string[] = []

  keys.forEach(key => {
    if (!key || visited.has(key)) {
      return
    }

    visited.add(key)
    uniqueKeys.push(key)
  })

  return uniqueKeys
}

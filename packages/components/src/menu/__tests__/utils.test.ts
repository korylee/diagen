import { describe, expect, it } from 'vitest'

import type { MenuDataItem } from '../types'
import {
  findMenuItemByKey,
  findMenuKeyPath,
  getMenuAncestorKeys,
  getMenuDescendantSubMenuKeys,
  getMenuSubMenuKeys,
  hasMenuSelectedDescendant,
  isMenuDivider,
  isMenuGroup,
  isMenuItem,
  isMenuSubMenu,
  uniqueMenuKeys,
} from '../utils'

const items: readonly MenuDataItem[] = [
  {
    key: 'workspace',
    label: 'Workspace',
    children: [
      {
        type: 'group',
        label: 'Documents',
        children: [
          { key: 'recent', label: 'Recent' },
          {
            key: 'favorites',
            label: 'Favorites',
            children: [{ key: 'starred', label: 'Starred' }],
          },
        ],
      },
    ],
  },
  {
    key: 'team',
    label: 'Team',
  },
  {
    type: 'divider',
  },
]

describe('menu utils', () => {
  describe('类型守卫', () => {
    it('能够识别 submenu / group / item / divider', () => {
      const workspace = items[0]

      if (!workspace || !isMenuSubMenu(workspace)) {
        throw new Error('workspace 节点缺失')
      }

      expect(isMenuSubMenu(workspace)).toBe(true)
      expect(isMenuGroup(workspace.children[0] ?? null)).toBe(true)
      expect(isMenuItem(items[1])).toBe(true)
      expect(isMenuDivider(items[2])).toBe(true)
    })
  })

  describe('findMenuItemByKey', () => {
    it('能够在嵌套结构中找到目标节点', () => {
      const item = findMenuItemByKey(items, 'starred')

      expect(item).toMatchObject({
        key: 'starred',
        label: 'Starred',
      })
    })
  })

  describe('findMenuKeyPath 与 getMenuAncestorKeys', () => {
    it('返回从当前节点到根 submenu 的 keyPath', () => {
      expect(findMenuKeyPath(items, 'starred')).toEqual(['starred', 'favorites', 'workspace'])
      expect(getMenuAncestorKeys(items, 'starred')).toEqual(['favorites', 'workspace'])
    })
  })

  describe('submenu key 采集', () => {
    it('能够收集整棵树里的 submenu keys', () => {
      expect(getMenuSubMenuKeys(items)).toEqual(['workspace', 'favorites'])
      expect(getMenuDescendantSubMenuKeys(items[0])).toEqual(['favorites'])
    })
  })

  describe('选中态辅助', () => {
    it('能够判断 submenu 下是否存在选中的后代', () => {
      const workspace = items[0]

      if (!workspace || !isMenuSubMenu(workspace)) {
        throw new Error('workspace 节点缺失')
      }

      expect(hasMenuSelectedDescendant(workspace.children, ['starred'])).toBe(true)
      expect(hasMenuSelectedDescendant(workspace.children, ['team'])).toBe(false)
    })
  })

  describe('uniqueMenuKeys', () => {
    it('会保持顺序并去重', () => {
      expect(uniqueMenuKeys(['workspace', 'favorites', 'workspace', '', 'team'])).toEqual([
        'workspace',
        'favorites',
        'team',
      ])
    })
  })
})

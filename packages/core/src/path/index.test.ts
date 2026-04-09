import { describe, expect, it } from 'vitest'
import { Schema } from '../schema'
import {
  compilePathActions,
  evaluateCompiledPathAction,
  resolvePathActions,
  resolvePathAnchors,
  resolvePathPoint,
  resolvePathValue,
} from './index'

describe('pathActions', () => {
  describe('resolvePathValue', () => {
    it('应该支持 undefined 与表达式求值', () => {
      expect(resolvePathValue(undefined, 100, 50)).toBe(0)
      expect(resolvePathValue(12, 100, 50)).toBe(12)
      expect(resolvePathValue('w/2', 100, 50)).toBe(50)
      expect(resolvePathValue('h-10', 100, 50)).toBe(40)
    })
  })

  describe('resolvePathPoint 与 resolvePathAnchors', () => {
    it('应该解析点与锚点数组', () => {
      expect(resolvePathPoint('w/2', 'h/2', 100, 60)).toEqual({ x: 50, y: 30 })
      expect(
        resolvePathAnchors(
          [
            { x: 0, y: 0 },
            { x: 'w', y: 'h' },
          ],
          100,
          60,
        ),
      ).toEqual([
        { x: 0, y: 0 },
        { x: 100, y: 60 },
      ])
    })
  })

  describe('compilePathActions + evaluateCompiledPathAction', () => {
    it('应该编译并执行路径动作参数', () => {
      const [compiled] = compilePathActions([
        {
          action: 'curve',
          x: 'w',
          y: 'h',
          x1: 'w/2',
          y1: 0,
          x2: 'w',
          y2: 'h/2',
        },
      ])

      expect(evaluateCompiledPathAction(compiled, 120, 80)).toEqual({
        action: 'curve',
        x: 120,
        y: 80,
        x1: 60,
        y1: 0,
        x2: 120,
        y2: 40,
      })
    })
  })

  describe('resolvePathActions', () => {
    it('应该支持直接动作数组解析', () => {
      const result = resolvePathActions(
        [
          { action: 'move', x: 0, y: 0 },
          { action: 'line', x: 'w', y: 'h' },
        ],
        100,
        50,
      )

      expect(result).toEqual([
        { action: 'move', x: 0, y: 0 },
        { action: 'line', x: 100, y: 50 },
      ])
    })

    it('应该支持 ref 引用全局命令解析', () => {
      const ref = '__path_actions_test_command__'
      Schema.addGlobalCommand(ref, [
        { action: 'move', x: 0, y: 0 },
        { action: 'line', x: 'w/2', y: 'h/2' },
      ])

      const result = resolvePathActions({ ref }, 120, 80)
      expect(result).toEqual([
        { action: 'move', x: 0, y: 0 },
        { action: 'line', x: 60, y: 40 },
      ])
    })

    it('ref 不存在时应该返回空数组', () => {
      expect(resolvePathActions({ ref: '__path_actions_not_found__' }, 100, 50)).toEqual([])
    })
  })
})

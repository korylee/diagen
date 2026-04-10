import { describe, expect, it } from 'vitest'
import { createLinker, createShape } from '../model'
import { getLinkerTextBox, getShapeTextBox, isPointInShapeTextBox } from './index'

describe('text', () => {
  describe('getLinkerTextBox', () => {
    it('应按路径长度中点定位连线文本框', () => {
      const box = getLinkerTextBox(
        {
          points: [
            { x: 0, y: 0 },
            { x: 60, y: 0 },
            { x: 60, y: 100 },
          ],
          fromAngle: 0,
          toAngle: Math.PI / 2,
        },
        '文本',
        createLinker({
          id: 'text_linker',
          name: 'text_linker',
          linkerType: 'straight',
          from: { id: null, x: 0, y: 0, binding: { type: 'free' } },
          to: { id: null, x: 100, y: 0, binding: { type: 'free' } },
        }).fontStyle,
      )

      expect(box).toBeTruthy()
      expect(box?.cx).toBeCloseTo(60)
      expect(box?.cy).toBeCloseTo(20)
    })
  })

  describe('getShapeTextBox', () => {
    it('应计算图形文本框中心并保留旋转角', () => {
      const shape = createShape({
        id: 'shape_text_box',
        name: 'shape_text_box',
        props: { x: 0, y: 0, w: 100, h: 60, angle: 90 },
        textBlock: [
          {
            text: '标题',
            position: { x: 10, y: 20, w: 30, h: 10 },
          },
        ],
      })

      const box = getShapeTextBox(shape)
      expect(box).toBeTruthy()
      expect(box?.x).toBe(10)
      expect(box?.y).toBe(20)
      expect(box?.w).toBe(30)
      expect(box?.h).toBe(10)
      expect(box?.angle).toBe(90)
      expect(box?.cx).toBeCloseTo(55)
      expect(box?.cy).toBeCloseTo(5)
    })
  })

  describe('isPointInShapeTextBox', () => {
    it('应支持旋转后的文本框命中', () => {
      const shape = createShape({
        id: 'shape_text_hit',
        name: 'shape_text_hit',
        props: { x: 0, y: 0, w: 100, h: 60, angle: 90 },
        textBlock: [
          {
            text: '标题',
            position: { x: 10, y: 20, w: 30, h: 10 },
          },
        ],
      })

      expect(isPointInShapeTextBox(shape, { x: 55, y: 5 })).toBe(true)
      expect(isPointInShapeTextBox(shape, { x: 10, y: 10 })).toBe(false)
    })
  })
})

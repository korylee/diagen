import { describe, expect, it } from 'vitest'
import { createLinker, createShape } from '@diagen/core'
import { resolveContainerCursor, resolveScenePrimaryIntent } from '../rendererInteractionUtils'

describe('rendererInteractionUtils', () => {
  describe('resolveContainerCursor', () => {
    it('拖拽态应优先显示 grabbing', () => {
      expect(
        resolveContainerCursor({
          isGrabbing: true,
          toolType: 'create-shape',
        }),
      ).toBe('grabbing')
    })

    it('创建工具态应显示 crosshair', () => {
      expect(
        resolveContainerCursor({
          isGrabbing: false,
          toolType: 'create-linker',
        }),
      ).toBe('crosshair')
    })

    it('空闲态应显示 default', () => {
      expect(
        resolveContainerCursor({
          isGrabbing: false,
          toolType: 'idle',
        }),
      ).toBe('default')
    })
  })

  describe('resolveScenePrimaryIntent', () => {
    it('应优先解析创建图形意图', () => {
      const point = { x: 10, y: 20 }

      expect(
        resolveScenePrimaryIntent({
          tool: {
            type: 'create-shape',
            shapeId: 'shape',
            continuous: true,
          },
          point,
          sceneHit: null,
        }),
      ).toEqual({
        type: 'create-shape',
        shapeId: 'shape',
        continuous: true,
        point,
      })
    })

    it('应在创建连线时保留命中信息', () => {
      const point = { x: 30, y: 40 }
      const shape = createShape({
        id: 'target-shape',
        name: 'target-shape',
        group: null,
        props: { x: 0, y: 0, w: 100, h: 80, angle: 0 },
      })

      expect(
        resolveScenePrimaryIntent({
          tool: {
            type: 'create-linker',
            linkerId: 'linker',
            continuous: false,
          },
          point,
          sceneHit: {
            type: 'shape',
            element: shape,
          },
        }),
      ).toEqual({
        type: 'create-linker',
        linkerId: 'linker',
        continuous: false,
        point,
        sceneHit: {
          type: 'shape',
          element: shape,
        },
      })
    })

    it('空闲态点击连线时应解析为编辑连线', () => {
      const point = { x: 50, y: 60 }
      const linker = createLinker({
        id: 'linker-id',
        name: 'linker-id',
        from: {
          id: null,
          x: 0,
          y: 0,
          binding: { type: 'free' },
        },
        to: {
          id: null,
          x: 100,
          y: 0,
          binding: { type: 'free' },
        },
      })

      expect(
        resolveScenePrimaryIntent({
          tool: { type: 'idle' },
          point,
          sceneHit: {
            type: 'linker',
            element: linker,
            hit: { type: 'line' },
            route: {
              points: [
                { x: 0, y: 0 },
                { x: 100, y: 0 },
              ],
              fromAngle: 0,
              toAngle: 0,
            },
          },
        }).type,
      ).toBe('edit-linker')
    })

    it('空闲态点中图形时应解析为图形交互', () => {
      const point = { x: 70, y: 80 }
      const shape = createShape({
        id: 'shape-id',
        name: 'shape-id',
        group: null,
        props: { x: 0, y: 0, w: 100, h: 80, angle: 0 },
      })

      expect(
        resolveScenePrimaryIntent({
          tool: { type: 'idle' },
          point,
          sceneHit: {
            type: 'shape',
            element: shape,
          },
        }),
      ).toEqual({
        type: 'interact-shape',
        point,
        shapeId: shape.id,
      })
    })

    it('空闲态点空白处时应解析为 blank', () => {
      expect(
        resolveScenePrimaryIntent({
          tool: { type: 'idle' },
          point: { x: 0, y: 0 },
          sceneHit: null,
        }),
      ).toEqual({ type: 'blank' })
    })
  })
})

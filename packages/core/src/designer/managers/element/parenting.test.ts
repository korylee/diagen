import { describe, expect, it } from 'vitest'
import { createShape, type ShapeElement } from '../../../model'
import { resolveParentPreview, resolveParenting } from './parenting'

function createTestShape(input: {
  id: string
  x: number
  y: number
  w?: number
  h?: number
  parent?: string | null
  children?: string[]
  container?: boolean
}): ShapeElement {
  return createShape({
    id: input.id,
    name: input.id,
    parent: input.parent ?? null,
    children: input.children ?? [],
    attribute: {
      ...createShape({}).attribute,
      container: input.container ?? false,
    },
    props: {
      x: input.x,
      y: input.y,
      w: input.w ?? 100,
      h: input.h ?? 80,
      angle: 0,
    },
  })
}

describe('element parenting', () => {
  it('应优先选择最内层容器，并同步修正新旧容器 children', () => {
    const outer = createTestShape({
      id: 'outer_container',
      x: 0,
      y: 0,
      w: 400,
      h: 300,
      container: true,
    })
    const inner = createTestShape({
      id: 'inner_container',
      x: 80,
      y: 60,
      w: 180,
      h: 140,
      parent: outer.id,
      children: [],
      container: true,
    })
    outer.children = [inner.id]
    const shape = createTestShape({
      id: 'drag_shape',
      x: 120,
      y: 100,
      w: 60,
      h: 40,
      parent: null,
    })

    const result = resolveParenting({
      shapes: [outer, inner, shape],
      targetIds: [shape.id],
      getBounds: current => current.props,
    })

    expect(result.parentUpdates).toEqual([
      {
        id: shape.id,
        parent: inner.id,
      },
    ])
    expect(result.childrenUpdates).toEqual([
      {
        id: inner.id,
        children: [shape.id],
      },
    ])
  })

  it('拖拽父子集合时，子元素应保持原 parent', () => {
    const container = createTestShape({
      id: 'drag_parent',
      x: 100,
      y: 100,
      w: 200,
      h: 160,
      children: ['drag_child'],
      container: true,
    })
    const child = createTestShape({
      id: 'drag_child',
      x: 140,
      y: 140,
      w: 60,
      h: 40,
      parent: container.id,
    })
    const target = createTestShape({
      id: 'target_container',
      x: 0,
      y: 0,
      w: 500,
      h: 400,
      container: true,
    })

    const result = resolveParenting({
      shapes: [target, container, child],
      targetIds: [container.id, child.id],
      getBounds: current => current.props,
    })

    expect(result.parentUpdates).toEqual([
      {
        id: container.id,
        parent: target.id,
      },
    ])
    expect(result.childrenUpdates).toEqual([
      {
        id: target.id,
        children: [container.id],
      },
    ])
  })

  it('不应把祖先容器挂到自己的后代上', () => {
    const ancestor = createTestShape({
      id: 'ancestor',
      x: 120,
      y: 120,
      w: 80,
      h: 60,
      children: ['descendant'],
      container: true,
    })
    const descendant = createTestShape({
      id: 'descendant',
      x: 100,
      y: 100,
      w: 200,
      h: 160,
      parent: ancestor.id,
      container: true,
    })

    const result = resolveParenting({
      shapes: [ancestor, descendant],
      targetIds: [ancestor.id],
      getBounds: current => current.props,
    })

    expect(result.parentUpdates).toEqual([])
    expect(result.childrenUpdates).toEqual([])
  })

  it('离开原容器且未命中新容器时，应正式脱离容器', () => {
    const container = createTestShape({
      id: 'old_container',
      x: 0,
      y: 0,
      w: 120,
      h: 120,
      children: ['shape_in_container'],
      container: true,
    })
    const shape = createTestShape({
      id: 'shape_in_container',
      x: 220,
      y: 220,
      w: 60,
      h: 40,
      parent: container.id,
    })

    const result = resolveParenting({
      shapes: [container, shape],
      targetIds: [shape.id],
      getBounds: current => current.props,
    })

    expect(result.parentUpdates).toEqual([
      {
        id: shape.id,
        parent: null,
      },
    ])
    expect(result.childrenUpdates).toEqual([
      {
        id: container.id,
        children: [],
      },
    ])
  })

  it('原 parent 不是容器时，不应继续保留该 parent', () => {
    const invalidParent = createTestShape({
      id: 'invalid_parent',
      x: 0,
      y: 0,
      w: 200,
      h: 200,
      container: false,
    })
    const shape = createTestShape({
      id: 'shape_with_invalid_parent',
      x: 40,
      y: 50,
      w: 60,
      h: 40,
      parent: invalidParent.id,
    })

    const result = resolveParenting({
      shapes: [invalidParent, shape],
      targetIds: [shape.id],
      getBounds: current => current.props,
    })

    expect(result.parentUpdates).toEqual([
      {
        id: shape.id,
        parent: null,
      },
    ])
    expect(result.childrenUpdates).toEqual([])
  })

  it('默认仍使用中心点命中容器', () => {
    const container = createTestShape({
      id: 'center_container',
      x: 100,
      y: 100,
      w: 120,
      h: 120,
      container: true,
    })
    const shape = createTestShape({
      id: 'center_shape',
      x: 90,
      y: 130,
      w: 140,
      h: 40,
    })

    const result = resolveParenting({
      shapes: [container, shape],
      targetIds: [shape.id],
      getBounds: current => current.props,
    })

    expect(result.parentUpdates).toEqual([
      {
        id: shape.id,
        parent: container.id,
      },
    ])
    expect(result.childrenUpdates).toEqual([
      {
        id: container.id,
        children: [shape.id],
      },
    ])
  })

  it('bounds 模式下应要求完整包围盒落入容器', () => {
    const container = createTestShape({
      id: 'bounds_container',
      x: 100,
      y: 100,
      w: 120,
      h: 120,
      container: true,
    })
    const shape = createTestShape({
      id: 'bounds_shape',
      x: 90,
      y: 130,
      w: 140,
      h: 40,
    })

    const result = resolveParenting({
      shapes: [container, shape],
      targetIds: [shape.id],
      getBounds: current => current.props,
      containment: 'bounds',
    })

    expect(result.parentUpdates).toEqual([])
    expect(result.childrenUpdates).toEqual([])
  })

  it('同面积重叠容器时，应优先选择更靠后的容器', () => {
    const back = createTestShape({
      id: 'back_container',
      x: 100,
      y: 100,
      w: 160,
      h: 120,
      container: true,
    })
    const front = createTestShape({
      id: 'front_container',
      x: 100,
      y: 100,
      w: 160,
      h: 120,
      container: true,
    })
    const shape = createTestShape({
      id: 'same_area_shape',
      x: 140,
      y: 140,
      w: 40,
      h: 30,
    })

    const result = resolveParenting({
      shapes: [back, front, shape],
      targetIds: [shape.id],
      getBounds: current => current.props,
    })

    expect(result.parentUpdates).toEqual([
      {
        id: shape.id,
        parent: front.id,
      },
    ])
    expect(result.childrenUpdates).toEqual([
      {
        id: front.id,
        children: [shape.id],
      },
    ])
  })

  it('resolveParentPreview 应返回当前预览父容器 id', () => {
    const container = createTestShape({
      id: 'preview_container',
      x: 0,
      y: 0,
      w: 220,
      h: 180,
      container: true,
    })
    const shape = createTestShape({
      id: 'preview_shape',
      x: 60,
      y: 50,
      w: 80,
      h: 60,
    })

    expect(
      resolveParentPreview({
        shapes: [container, shape],
        targetIds: [shape.id],
        getBounds: current => current.props,
      }),
    ).toBe(container.id)
  })

  it('多选目标预览父容器不一致时，应返回 null', () => {
    const containerA = createTestShape({
      id: 'preview_container_a',
      x: 0,
      y: 0,
      w: 220,
      h: 180,
      container: true,
    })
    const containerB = createTestShape({
      id: 'preview_container_b',
      x: 300,
      y: 0,
      w: 220,
      h: 180,
      container: true,
    })
    const shapeA = createTestShape({
      id: 'preview_shape_a',
      x: 60,
      y: 50,
      w: 80,
      h: 60,
    })
    const shapeB = createTestShape({
      id: 'preview_shape_b',
      x: 360,
      y: 50,
      w: 80,
      h: 60,
    })

    expect(
      resolveParentPreview({
        shapes: [containerA, containerB, shapeA, shapeB],
        targetIds: [shapeA.id, shapeB.id],
        getBounds: current => current.props,
      }),
    ).toBeNull()
  })

  it('应支持通过 canContain 拒绝容器包含目标', () => {
    const container = createTestShape({
      id: 'rule_container',
      x: 0,
      y: 0,
      w: 220,
      h: 180,
      container: true,
    })
    const shape = createTestShape({
      id: 'rule_shape',
      x: 60,
      y: 50,
      w: 80,
      h: 60,
    })

    const result = resolveParenting({
      shapes: [container, shape],
      targetIds: [shape.id],
      getBounds: current => current.props,
      canContain: () => false,
    })

    expect(result.parentUpdates).toEqual([])
    expect(result.childrenUpdates).toEqual([])
  })

  it('应支持通过 canBeContained 拒绝目标被容器包含', () => {
    const container = createTestShape({
      id: 'reject_parent_container',
      x: 0,
      y: 0,
      w: 220,
      h: 180,
      container: true,
    })
    const shape = createTestShape({
      id: 'reject_parent_shape',
      x: 60,
      y: 50,
      w: 80,
      h: 60,
    })

    const result = resolveParenting({
      shapes: [container, shape],
      targetIds: [shape.id],
      getBounds: current => current.props,
      canBeContained: () => false,
    })

    expect(result.parentUpdates).toEqual([])
    expect(result.childrenUpdates).toEqual([])
  })
})

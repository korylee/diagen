import { describe, expect, it } from 'vitest'
import { DEFAULTS } from '../constants'
import { createLinker } from './linker'
import { createShape } from './shape'

describe('model/defaults isolation', () => {
  it('createShape 创建的默认样式与结构不应共享引用', () => {
    const shapeA = createShape({})
    const shapeB = createShape({})

    shapeA.fillStyle.color = '0,0,0'
    shapeA.fontStyle.size = 99
    shapeA.textBlock[0].position.x = 999
    shapeA.anchors[0].x = '10'
    shapeA.path[0].actions[0].x = '20'
    shapeA.attribute.linkable = false

    expect(shapeB.fillStyle.color).toBe(DEFAULTS.style.fill.color)
    expect(shapeB.fontStyle.size).toBe(DEFAULTS.style.font.size)
    expect(shapeB.textBlock[0].position.x).toBe(DEFAULTS.shape.textBlock.position.x)
    expect(shapeB.anchors[0].x).toBe(DEFAULTS.shape.anchors[0].x)
    expect(shapeB.path[0].actions[0].x).toBe(DEFAULTS.shape.path[0].actions[0].x)
    expect(shapeB.attribute.linkable).toBe(DEFAULTS.shape.attribute.linkable)

    expect(DEFAULTS.style.fill.color).toBe('255,255,255')
    expect(DEFAULTS.style.font.size).toBe(13)
    expect(DEFAULTS.shape.textBlock.position.x).toBe(10)
    expect(DEFAULTS.shape.anchors[0].x).toBe('w/2')
    expect(DEFAULTS.shape.path[0].actions[0].x).toBe('0')
    expect(DEFAULTS.shape.attribute.linkable).toBe(true)
  })

  it('createLinker 创建的默认样式不应共享引用', () => {
    const linkerA = createLinker({})
    const linkerB = createLinker({})

    linkerA.lineStyle.lineColor = '1,1,1'
    linkerA.fontStyle.size = 42

    expect(linkerB.lineStyle.lineColor).toBe(DEFAULTS.style.line.lineColor)
    expect(linkerB.fontStyle.size).toBe(DEFAULTS.style.font.size)
    expect(DEFAULTS.style.line.lineColor).toBe('50,50,50')
    expect(DEFAULTS.style.font.size).toBe(13)
  })

  it('lineStyle 默认值字段应自洽', () => {
    expect(DEFAULTS.style.line.lineWidth).toBe(2)
    expect(DEFAULTS.style.line.lineColor).toBe('50,50,50')
    expect(DEFAULTS.style.line.lineStyle).toBe('solid')
  })
})

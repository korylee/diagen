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

    expect(shapeB.fillStyle.color).toBe(DEFAULTS.DEFAULT_FILL_STYLE.color)
    expect(shapeB.fontStyle.size).toBe(DEFAULTS.DEFAULT_FONT_STYLE.size)
    expect(shapeB.textBlock[0].position.x).toBe(DEFAULTS.DEFAULT_TEXT_BLOCK.position.x)
    expect(shapeB.anchors[0].x).toBe(DEFAULTS.DEFAULT_ANCHORS[0].x)
    expect(shapeB.path[0].actions[0].x).toBe(DEFAULTS.DEFAULT_PATH[0].actions[0].x)
    expect(shapeB.attribute.linkable).toBe(DEFAULTS.DEFAULT_ATTRIBUTE.linkable)

    expect(DEFAULTS.DEFAULT_FILL_STYLE.color).toBe('255,255,255')
    expect(DEFAULTS.DEFAULT_FONT_STYLE.size).toBe(13)
    expect(DEFAULTS.DEFAULT_TEXT_BLOCK.position.x).toBe(10)
    expect(DEFAULTS.DEFAULT_ANCHORS[0].x).toBe('w/2')
    expect(DEFAULTS.DEFAULT_PATH[0].actions[0].x).toBe('0')
    expect(DEFAULTS.DEFAULT_ATTRIBUTE.linkable).toBe(true)
  })

  it('createLinker 创建的默认样式不应共享引用', () => {
    const linkerA = createLinker({})
    const linkerB = createLinker({})

    linkerA.lineStyle.lineColor = '1,1,1'
    linkerA.fontStyle.size = 42

    expect(linkerB.lineStyle.lineColor).toBe(DEFAULTS.DEFAULT_LINE_STYLE.lineColor)
    expect(linkerB.fontStyle.size).toBe(DEFAULTS.DEFAULT_FONT_STYLE.size)
    expect(DEFAULTS.DEFAULT_LINE_STYLE.lineColor).toBe('50,50,50')
    expect(DEFAULTS.DEFAULT_FONT_STYLE.size).toBe(13)
  })

  it('线条快捷默认值应与 DEFAULT_LINE_STYLE 保持一致', () => {
    expect(DEFAULTS.DEFAULT_LINE_WIDTH).toBe(DEFAULTS.DEFAULT_LINE_STYLE.lineWidth)
    expect(DEFAULTS.DEFAULT_LINE_COLOR).toBe(DEFAULTS.DEFAULT_LINE_STYLE.lineColor)
  })
})

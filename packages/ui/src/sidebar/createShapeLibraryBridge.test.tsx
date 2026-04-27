import { describe, expect, it } from 'vitest'
import { createRoot } from 'solid-js'
import { createShapeLibraryBridge } from './createShapeLibraryBridge'

describe('createShapeLibraryBridge', () => {
  it('图形与连线条目应提供统一 preview 描述', () => {
    createRoot(dispose => {
      const bridge = createShapeLibraryBridge({
        tool: {
          toolState: () => ({ type: 'idle' }),
        },
      } as never)

      const sections = bridge.sections()
      const shapeItem = sections[0]?.items[0]
      const linkerItem = sections.find(section => section.id === 'category:linkers')?.items[0]

      expect(shapeItem?.preview).toEqual({
        schema: 'shape',
        schemaId: shapeItem?.id.replace('tool:shape:', ''),
        accent: '#8b5e34',
      })
      expect(linkerItem?.preview).toEqual({
        schema: 'linker',
        schemaId: linkerItem?.id.replace('tool:linker:', ''),
        accent: '#0f766e',
      })

      dispose()
    })
  })
})

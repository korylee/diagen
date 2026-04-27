import { createRoot } from 'solid-js'
import { describe, expect, it } from 'vitest'
import { createDesigner, Designer } from './create'

function withDesigner(run: (designer: Designer) => void) {
  createRoot(dispose => {
    const designer = createDesigner()
    try {
      run(designer)
    } finally {
      dispose()
    }
  })
}

describe('createDesigner', () => {
  it('loadFromJSON 遇到旧 binding.target 格式时应立即报错', () => {
    withDesigner(designer => {
      const legacy = JSON.stringify({
        elements: {
          linker_1: {
            id: 'linker_1',
            type: 'linker',
            name: 'linker_1',
            text: '',
            group: null,
            parent: null,
            children: [],
            zIndex: 0,
            locked: false,
            visible: true,
            linkerType: 'broken',
            lineStyle: {},
            fontStyle: {},
            dataAttributes: [],
            data: {},
            points: [],
            from: {
              x: 0,
              y: 0,
              binding: {
                type: 'anchor',
                target: 'shape_1',
                anchorId: 'right',
              },
            },
            to: {
              x: 100,
              y: 0,
              binding: { type: 'free' },
            },
          },
        },
        orderList: ['linker_1'],
      })

      expect(() => designer.loadFromJSON(legacy)).toThrow(
        'Legacy linker endpoint format `binding.target` is no longer supported. Please migrate the diagram data.',
      )
    })
  })
})

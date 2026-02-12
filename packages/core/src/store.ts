import { createStore, produce } from 'solid-js/store'

type EngineState = {
  shapes: Record<string, any>
  order: string[]
  selectedIds: string[]
  viewport: {
    zoom: number
    panX: number
    panY: number
  }
  page: Record<string, any>
}

export class DesignerStore {
  private _state = createStore<EngineState>({
    shapes: {},
    order: [],
    selectedIds: [],
    viewport: { zoom: 1, panX: 0, panY: 0 },
    page: { width: 1920, height: 1080, backgroundColor: '#ffffff', grid: true },
  })

  private get state() {
    return this._state[0]
  }

  private get setState() {
    return this._state[1]
  }

  addShape(shape: any) {
    const zindex = this.state.order.length
    const id = Date.now().toString(32)

    this.setState('shapes', id, { ...shape, id, zindex })
    this.setState('order', list => [...list, id])

    return id
  }

  removeShape(id: string) {
    this.setState(
      'shapes',
      produce(s => delete s[id]),
    )
    this.setState('order', list => list.filter(shapeId => shapeId !== id))
    this.setState('selectedIds', list => list.filter(selectedId => selectedId !== id))
  }

  updateShape(id: string) {}
}

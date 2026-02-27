import { deepClone, ensureArray, generateId, keys } from '@diagen/shared'
import { batch } from 'solid-js'
import type { DiagramElement } from '../../model'
import { CreateMethods, type ElementManager } from './element'
import type { Command, HistoryManager } from './history'
import { type SelectionManager } from './selection'
import { DesignerContext } from './types'

class AddCommand implements Command {
  id = generateId()
  name = 'add_els'
  readonly timestamp = Date.now()
  constructor(
    private readonly deps: EditDeps,
    private readonly elements: DiagramElement[],
  ) {}
  execute() {
    this.deps.element.add(this.elements)
  }
  undo() {
    this.deps.element.remove(this.elements)
  }
  redo() {
    this.execute()
  }
  canMergeWith(next: Command): boolean {
    return next instanceof AddCommand && Date.now() - this.timestamp < 300
  }
  merge(next: Command) {
    if (!(next instanceof AddCommand)) return null
    return new AddCommand(this.deps, [...this.elements, ...next.elements])
  }
}

class RemoveCommand implements Command {
  id = generateId()
  name = 'remove_els'
  readonly timestamp = Date.now()

  constructor(
    private readonly deps: EditDeps,
    private readonly elements: DiagramElement[],
  ) {}
  execute() {
    const { element, selection } = this.deps
    element.remove(this.elements)
    selection.deselect(this.elements.map(el => el.id))
  }
  undo() {
    const { element } = this.deps
    element.add(this.elements)
  }
  redo() {
    this.execute()
  }
  canMergeWith(next: Command) {
    return next instanceof RemoveCommand && Date.now() - this.timestamp < 300
  }
  merge(next: Command) {
    if (!(next instanceof RemoveCommand)) return null
    return new RemoveCommand(this.deps, [...this.elements, ...next.elements])
  }
}

class UpdateCommand implements Command {
  id = generateId()
  name = 'update_els'
  readonly timestamp = Date.now()
  cahce: Record<string, Partial<DiagramElement>>
  constructor(
    private readonly deps: EditDeps,
    private readonly ids: string[],
    private readonly overrides: Partial<DiagramElement>,
  ) {
    const _keys = keys(overrides)
    this.cahce = ids.reduce(
      (acc, id) => {
        const el = deps.element.getById(id)
        acc[id] = _keys.reduce((acc, cur) => {
          acc[cur] = deepClone(el[cur])
          return acc
        }, {} as any)
        return acc
      },
      {} as Record<string, Partial<DiagramElement>>,
    )
  }
  execute() {
    batch(() => {
      this.ids.forEach(id => {
        this.deps.element.update(id, deepClone(this.overrides))
      })
    })
  }
  undo() {
    batch(() => {
      this.ids.forEach(id => {
        this.deps.element.update(id, deepClone(this.cahce[id]))
      })
    })
  }
  redo() {
    this.execute()
  }
}

class MoveCommand implements Command {
  id = generateId()
  name = 'move_els'
  readonly timestamp = Date.now()
  constructor(
    private readonly deps: EditDeps,
    private readonly elements: DiagramElement[],
    private dx: number,
    private dy: number,
  ) {}

  execute() {
    this.deps.element.move(this.elements, this.dx, this.dy)
  }
  undo() {
    this.deps.element.move(this.elements, -this.dx, -this.dy)
  }
  redo() {
    this.execute()
  }
  canMergeWith(next: Command): boolean {
    return (
      next instanceof MoveCommand &&
      next.elements.length === this.elements.length &&
      next.elements.every((el, i) => el.id === this.elements[i].id)
    )
  }
  merge(next: Command) {
    if (!(next instanceof MoveCommand)) return null
    this.dx += next.dx
    this.dy += next.dy
    return this
  }
}

class ClearCommand implements Command {
  id = generateId()
  name = 'clear_els'
  readonly timestamp = Date.now()
  private readonly elements: Record<string, DiagramElement>
  private readonly orderList: string[]

  constructor(
    private readonly ctx: DesignerContext,
    private readonly deps: EditDeps,
  ) {
    const { element } = deps
    this.elements = element.elementMap()
    this.orderList = element.orderList().slice()
  }

  execute() {
    const { element, selection } = this.deps
    element.clear()
    selection.clear()
  }
  undo() {
    batch(() => {
      this.ctx.setState('diagram', 'elements', this.elements)
      this.ctx.setState('diagram', 'orderList', this.orderList)
    })
  }
  redo() {
    this.execute()
  }
}

interface EditDeps {
  element: ElementManager
  selection: SelectionManager
  history: HistoryManager
}

export function createEditManager(ctx: DesignerContext, deps: EditDeps) {
  const { element, selection, history } = deps

  function add(elements: DiagramElement[], options: { select?: boolean; record?: boolean } = {}): void {
    const { record = true, select = true } = options
    if (!record) {
      element.add(elements)
      select && selection.select(elements.map(el => el.id))
      return
    }
    const cmd = new AddCommand(deps, elements)

    history.execute(cmd)
  }

  function create<T extends keyof CreateMethods>(
    type: T,
    ...args: [...Parameters<CreateMethods[T]>, options?: { select?: boolean; record?: boolean }]
  ): ReturnType<CreateMethods[T]> {
    const lastArg = args[args.length - 1]
    const hasOptions = typeof lastArg === 'object' && lastArg !== null && ('select' in lastArg || 'record' in lastArg)

    const options = (hasOptions ? lastArg : {}) as { select?: boolean; record?: boolean }
    const createArgs = (hasOptions ? args.slice(0, -1) : args) as any

    const createdElement = element.create(type, ...createArgs)

    if (!createdElement) return null as any
    add([createdElement], options)
    return createdElement as any
  }

  function remove(id: string | string[], options: { record?: boolean } = {}): void {
    const ids = ensureArray(id)
    const { record = true } = options
    const els = ids.map(id => element.getById(id))
    if (!record) {
      element.remove(ids)
      selection.deselect(ids)
      return
    }
    const cmd = new RemoveCommand(deps, els)

    history.execute(cmd)
  }

  function update(id: string | string[], patch: Partial<DiagramElement>, options: { record?: boolean } = {}): void {
    const { record = true } = options
    const ids = ensureArray(id)

    if (!record) {
      element.update(ids, patch)
      return
    }
    const cmd = new UpdateCommand(deps, ids, patch)
    history.execute(cmd)
  }

  function clear(options: { record?: boolean } = {}): void {
    const { record = true } = options
    if (!record) {
      element.clear()
      selection.clear()
      return
    }
    const cmd = new ClearCommand(ctx, deps)
    history.execute(cmd)
  }

  function move(ids: string[], dx: number, dy: number, options: { record?: boolean } = {}): void {
    const { record = true } = options
    const els = ids.map(id => element.getById(id)).filter(Boolean) as DiagramElement[]
    if (els.length === 0) return

    if (!record) {
      element.move(els, dx, dy)
      return
    }
    const cmd = new MoveCommand(deps, els, dx, dy)
    history.execute(cmd)
  }

  return {
    add,
    create,
    remove,
    update,
    clear,
    move,
  }
}

import { StoreContext } from './types'
import { type ElementManager } from './element'
import { Command, HistoryManager } from './history'
import { DiagramElement } from '../../model'
import { generateId } from '@diagen/shared'
import { type SelectionManager } from './selection'
import { deepClone } from '@diagen/shared/'
import { batch } from 'solid-js'

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
  previous: DiagramElement
  constructor(
    private readonly deps: EditDeps,
    private readonly element: DiagramElement,
    private readonly patch: Partial<DiagramElement>,
  ) {
    this.previous = deepClone(element)
  }
  // TODO solid-store只有更改没有覆盖，这里有问题
  execute() {
    this.deps.element.update(this.element.id, this.patch)
  }
  undo() {
    this.deps.element.update(this.element.id, this.previous)
  }
  redo() {
    this.execute()
  }
}

class ClearCommand implements Command {
  id = generateId()
  name = 'clear_els'
  readonly timestamp = Date.now()
  private readonly elements: Record<string, DiagramElement>
  private readonly orderList: string[]

  constructor(
    private readonly ctx: StoreContext,
    private readonly deps: EditDeps,
  ) {
    const { element } = deps
    this.elements = deepClone(element.elementMap())
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

export function createEditManager(ctx: StoreContext, deps: EditDeps) {
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

  function remove(ids: string[], options: { record?: boolean } = {}): void {
    const { record = true } = options
    const els = ids.map(id => element.getElementById(id))
    if (!record) {
      element.remove(ids)
      selection.deselect(ids)
      return
    }
    const cmd = new RemoveCommand(deps, els)

    history.execute(cmd)
  }

  function update(id: string, patch: Partial<DiagramElement>, options: { record?: boolean } = {}): void {
    const { record = true } = options
    const el = element.getElementById(id)

    if (!record) {
      element.update(id, patch)
      return
    }
    const cmd = new UpdateCommand(deps, el, patch)
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

  return {
    add,
    remove,
    update,
    clear,
  }
}

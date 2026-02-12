import { DesignerStore } from "./store";
import { CommandManager } from "./command";

export class DesignerEngine {
  readonly store = new DesignerStore();
  readonly bus = {} as any;
  readonly cmd = new CommandManager(this.store, this.bus);

  constructor() {}

  addShape() {}
}

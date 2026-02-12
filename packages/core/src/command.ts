import { DesignerStore } from "./store";

export interface Command {
  execute(): void;
  undo(): void;
  redo(): void;
}

export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  constructor(
    private store: DesignerStore,
    private bus: any,
  ) {}

  executeCommand(cmd: Command) {
    cmd.execute();
    this.undoStack.push(cmd);
    this.redoStack = []; // 新操作清空重做栈
    this.bus.emit("stateChanged");
  }

  undo() {
    const cmd = this.undoStack.pop();
    if (cmd) {
      cmd.undo();
      this.redoStack.push(cmd);
      this.bus.emit("stateChanged");
    }
  }

  redo() {
    const cmd = this.redoStack.pop();
    if (cmd) {
      cmd.redo();
      this.undoStack.push(cmd);
      this.bus.emit("stateChanged");
    }
  }
}

export class MoveCommand implements Command {
  constructor(
    private store: DesignerStore,
    private ids: string[],
    private dx: number,
    private dy: number,
  ) {}

  execute(): void {
    // this.store.moveShapes(this.ids, this.dx, this.dy);
  }
  undo(): void {}

  redo(): void {}
}

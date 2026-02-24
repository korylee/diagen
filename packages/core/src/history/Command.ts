/**
 * Command Interface
 * Base interface for all commands in the undo/redo system
 */

export interface ICommand {
  /** Unique identifier for the command */
  id: string;

  /** Human-readable name for the command */
  name: string;

  /** Execute the command */
  execute(): void;

  /** Undo the command */
  undo(): void;

  /** Redo the command (same as execute by default) */
  redo(): void;

  /** Whether this command can be merged with the previous one */
  isMergeable?: boolean;

  /** Whether this command is part of a transaction */
  transactionId?: string;
}

/** Abstract base command with common functionality */
export abstract class BaseCommand implements ICommand {
  abstract id: string;
  abstract name: string;
  abstract execute(): void;
  abstract undo(): void;

  redo(): void {
    this.execute();
  }

  isMergeable = false;
  transactionId?: string;
}

/**
 * Batch command that contains multiple sub-commands
 */
export class BatchCommand extends BaseCommand {
  name = 'Batch';
  isMergeable = true;

  constructor(
    public commands: ICommand[],
    public batchName?: string
  ) {
    super();
    this.id = `batch_${Date.now()}`;
    this.name = batchName || 'Batch';
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

/**
 * Command that does nothing (for placeholder/merge scenarios)
 */
export class NoOpCommand extends BaseCommand {
  id = 'noop';
  name = 'No Operation';

  execute(): void { /* no-op */ }
  undo(): void { /* no-op */ }
}

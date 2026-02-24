/**
 * History Manager
 * Manages undo/redo stacks using Command pattern
 */

import type { ICommand } from './Command';
import { BatchCommand } from './Command';
import { TransactionManager } from './Transaction';
import { DEFAULTS } from '@vectorgraph/shared';

export interface HistoryManagerOptions {
  maxSize?: number;
  onStackChange?: (undoCount: number, redoCount: number) => void;
}

/**
 * History Manager handles undo/redo functionality
 * Uses Command pattern for capturing state changes
 * and Transaction for batch operations
 */
export class HistoryManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private maxSize: number;
  private onStackChange?: (undoCount: number, redoCount: number) => void;
  private transactionManager: TransactionManager;

  // Batch mode for rapid operations (like dragging)
  private batchMode = false;
  private batchCommands: ICommand[] = [];

  constructor(options: HistoryManagerOptions = {}) {
    this.maxSize = options.maxSize || DEFAULTS.MAX_HISTORY_SIZE;
    this.onStackChange = options.onStackChange;
    this.transactionManager = new TransactionManager();
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Get number of available undo operations
   */
  getUndoCount(): number {
    return this.undoStack.length;
  }

  /**
   * Get number of available redo operations
   */
  getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Execute a command and add it to history
   * If in transaction/batch mode, the command is added to the current batch
   */
  execute(command: ICommand): void {
    // If in batch mode, add to batch
    if (this.batchMode) {
      this.batchCommands.push(command);
      command.execute();
      return;
    }

    // If in transaction, add to transaction
    if (this.transactionManager.isActive()) {
      this.transactionManager.addCommand(command);
      return;
    }

    // Otherwise, execute and add to undo stack
    command.execute();
    this.pushToUndo(command);
  }

  /**
   * Start batch mode for rapid operations (e.g., dragging)
   * Commands executed in batch mode are grouped into a single undo unit
   */
  beginBatch(name?: string): void {
    if (this.batchMode) {
      console.warn('Already in batch mode');
      return;
    }
    this.batchMode = true;
    this.batchCommands = [];
  }

  /**
   * End batch mode and commit all commands as a single undo unit
   */
  commitBatch(): ICommand | null {
    if (!this.batchMode) {
      console.warn('Not in batch mode');
      return null;
    }

    this.batchMode = false;

    if (this.batchCommands.length === 0) {
      return null;
    }

    // Merge all batch commands into a single command
    const batchCommand = new BatchCommand(this.batchCommands, name || 'Batch Operation');
    this.pushToUndo(batchCommand);
    this.batchCommands = [];

    this.notifyChange();

    return batchCommand;
  }

  /**
   * Cancel batch mode without saving
   */
  cancelBatch(): void {
    if (!this.batchMode) {
      return;
    }

    // Undo all commands in reverse order
    for (let i = this.batchCommands.length - 1; i >= 0; i--) {
      this.batchCommands[i].undo();
    }

    this.batchMode = false;
    this.batchCommands = [];
  }

  /**
   * Start a transaction
   */
  beginTransaction(name?: string): void {
    this.transactionManager.beginTransaction(name);
  }

  /**
   * Commit the current transaction
   */
  commitTransaction(): ICommand | null {
    const transaction = this.transactionManager.commitTransaction();

    if (transaction) {
      this.pushToUndo(transaction);
      this.notifyChange();
    }

    return transaction;
  }

  /**
   * Rollback the current transaction
   */
  rollbackTransaction(): void {
    this.transactionManager.rollbackTransaction();
  }

  /**
   * Undo the last operation
   * @returns true if undo was successful
   */
  undo(): boolean {
    if (!this.canUndo()) {
      return false;
    }

    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);

    this.notifyChange();
    return true;
  }

  /**
   * Redo the last undone operation
   * @returns true if redo was successful
   */
  redo(): boolean {
    if (!this.canRedo()) {
      return false;
    }

    const command = this.redoStack.pop()!;
    command.execute();
    this.undoStack.push(command);

    this.notifyChange();
    return true;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyChange();
  }

  /**
   * Push a command to the undo stack
   * Handles size limits and clears redo stack
   */
  private pushToUndo(command: ICommand): void {
    this.undoStack.push(command);

    // Clear redo stack when new command is executed
    this.redoStack = [];

    // Trim if exceeds max size
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    this.notifyChange();
  }

  /**
   * Notify listeners of stack change
   */
  private notifyChange(): void {
    if (this.onStackChange) {
      this.onStackChange(this.undoStack.length, this.redoStack.length);
    }
  }

  /**
   * Check if currently in batch mode
   */
  isInBatchMode(): boolean {
    return this.batchMode;
  }

  /**
   * Check if a transaction is active
   */
  isInTransaction(): boolean {
    return this.transactionManager.isActive();
  }

  /**
   * Get description of next undo operation
   */
  getUndoDescription(): string | null {
    if (!this.canUndo()) {
      return null;
    }
    return this.undoStack[this.undoStack.length - 1].name;
  }

  /**
   * Get description of next redo operation
   */
  getRedoDescription(): string | null {
    if (!this.canRedo()) {
      return null;
    }
    return this.redoStack[this.redoStack.length - 1].name;
  }
}

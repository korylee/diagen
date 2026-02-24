/**
 * Transaction Manager
 * Handles batch operations that should be treated as a single undo/redo unit
 */

import type { ICommand } from './Command';

/**
 * Transaction represents a batch of commands that should be
 * treated as a single atomic operation
 */
export class Transaction {
  public id: string;
  public name: string;
  public commands: ICommand[] = [];
  public startTime: number;
  public committed = false;

  constructor(name: string = 'Transaction') {
    this.id = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.name = name;
    this.startTime = Date.now();
  }

  /**
   * Add a command to the transaction
   */
  addCommand(command: ICommand): void {
    if (this.committed) {
      console.warn('Cannot add command to committed transaction');
      return;
    }

    command.transactionId = this.id;
    this.commands.push(command);
  }

  /**
   * Check if transaction is empty
   */
  isEmpty(): boolean {
    return this.commands.length === 0;
  }

  /**
   * Get the number of commands in the transaction
   */
  get length(): number {
    return this.commands.length;
  }

  /**
   * Execute all commands in the transaction
   */
  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  /**
   * Undo all commands in reverse order
   */
  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

/**
 * Transaction Manager for handling nested transactions
 */
export class TransactionManager {
  private currentTransaction: Transaction | null = null;
  private transactionStack: Transaction[] = [];

  /**
   * Check if a transaction is currently active
   */
  isActive(): boolean {
    return this.currentTransaction !== null;
  }

  /**
   * Get the current active transaction
   */
  getCurrentTransaction(): Transaction | null {
    return this.currentTransaction;
  }

  /**
   * Begin a new transaction
   * Note: This implementation does NOT support nested transactions
   * Calling begin again will commit the previous transaction
   */
  beginTransaction(name?: string): Transaction {
    // If there's already an active transaction, we need to handle it
    if (this.currentTransaction) {
      // Option 1: Auto-commit previous (ProcessOn behavior)
      // this.commitTransaction();

      // Option 2: Warn about nested transaction
      console.warn('Nested transactions not fully supported, consider committing first');
    }

    this.currentTransaction = new Transaction(name);
    return this.currentTransaction;
  }

  /**
   * Add a command to the current transaction
   * If no transaction is active, the command is executed immediately
   */
  addCommand(command: ICommand): void {
    if (this.currentTransaction && !this.currentTransaction.committed) {
      this.currentTransaction.addCommand(command);
    } else {
      // Execute immediately if no active transaction
      command.execute();
    }
  }

  /**
   * Commit the current transaction
   * Returns the committed transaction or null if no active transaction
   */
  commitTransaction(): Transaction | null {
    if (!this.currentTransaction) {
      return null;
    }

    if (this.currentTransaction.isEmpty()) {
      this.currentTransaction = null;
      return null;
    }

    this.currentTransaction.committed = true;
    const committed = this.currentTransaction;
    this.transactionStack.push(committed);
    this.currentTransaction = null;

    return committed;
  }

  /**
   * Rollback (cancel) the current transaction
   */
  rollbackTransaction(): void {
    if (!this.currentTransaction) {
      return;
    }

    // Undo any commands that were executed
    this.currentTransaction.undo();
    this.currentTransaction = null;
  }

  /**
   * Clear all pending transactions
   */
  clear(): void {
    this.currentTransaction = null;
    this.transactionStack = [];
  }
}

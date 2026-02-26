/**
 * 历史管理器
 * 使用命令模式管理撤销/重做栈
 * 提供事务和批处理模式用于复杂操作
 */

import type { ICommand } from './Command'
import { BatchCommand } from './Command'
import { generateId } from '@diagen/shared'
import { DEFAULTS } from '../constants'

/**
 * 历史管理器配置选项
 */
export interface HistoryManagerOptions {
  /** 最大存储的撤销/重做操作数量 */
  maxSize?: number
  /** 撤销/重做栈变化时的回调 */
  onStackChange?: (undoCount: number, redoCount: number) => void
}

/**
 * 事务表示一组应该被视为单个原子操作的命令
 */
export class Transaction implements ICommand {
  /** 唯一事务ID */
  public readonly id: string
  /** 事务中的命令 */
  public readonly commands: ICommand[] = []
  /** 事务开始时间 */
  public readonly startTime: number
  /** 事务是否已提交 */
  public committed = false

  /**
   * 创建新事务
   * @param name 事务名称（用于显示）
   */
  constructor(public name: string = 'Transaction') {
    this.id = generateId('txn')
    this.startTime = Date.now()
  }

  /**
   * 向事务添加命令
   * @param command 要添加的命令
   * @returns 命令是否添加成功
   */
  addCommand(command: ICommand): boolean {
    if (this.committed) {
      console.warn('无法向已提交的事务添加命令')
      return false
    }

    command.transactionId = this.id
    this.commands.push(command)
    return true
  }

  /**
   * 检查事务是否为空
   */
  isEmpty(): boolean {
    return this.commands.length === 0
  }

  /**
   * 获取事务中命令的数量
   */
  get length(): number {
    return this.commands.length
  }

  /**
   * 执行事务中的所有命令
   */
  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute()
    }
  }

  /**
   * 按相反顺序撤销事务中的所有命令
   */
  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo()
    }
  }

  /**
   * 重做事务中的所有命令
   */
  redo(): void {
    this.execute()
  }
}

/**
 * 历史管理器处理撤销/重做功能
 * 使用命令模式捕获状态变化
 * 使用事务处理批量操作
 */
export class HistoryManager {
  /** 撤销命令栈 */
  private readonly undoStack: ICommand[] = []
  /** 重做命令栈 */
  private readonly redoStack: ICommand[] = []
  /** 最大栈大小 */
  private readonly maxSize: number
  /** 栈变化回调 */
  private readonly onStackChange?: (undoCount: number, redoCount: number) => void

  /** 当前活动事务 */
  private currentTransaction: Transaction | null = null
  /** 事务历史 */
  private readonly transactionStack: Transaction[] = []

  /** 批处理模式状态 */
  private batchMode = false
  /** 当前批处理中的命令 */
  private batchCommands: ICommand[] = []
  /** 批处理操作名称 */
  private batchName?: string

  /**
   * 创建历史管理器
   * @param options 配置选项
   */
  constructor(options: HistoryManagerOptions = {}) {
    this.maxSize = options.maxSize || DEFAULTS.MAX_HISTORY_SIZE
    this.onStackChange = options.onStackChange
  }

  /**
   * 检查是否可以撤销
   */
  get canUndo(): boolean {
    return this.undoCount > 0
  }

  /**
   * 检查是否可以重做
   */
  get canRedo(): boolean {
    return this.redoCount > 0
  }

  /**
   * 获取可用的撤销操作数量
   */
  get undoCount(): number {
    return this.undoStack.length
  }

  /**
   * 获取可用的重做操作数量
   */
  get redoCount(): number {
    return this.redoStack.length
  }

  /**
   * 执行命令并添加到历史记录
   * 如果在事务/批处理模式下，命令会添加到当前上下文
   * @param command 要执行的命令
   * @returns 命令是否执行成功
   */
  execute(command: ICommand): boolean {
    if (!command) {
      console.warn('无法执行空命令')
      return false
    }

    // 如果在批处理模式下，添加到批处理
    if (this.batchMode) {
      this.batchCommands.push(command)
      command.execute()
      return true
    }

    // 如果在事务中，添加到事务
    if (this.currentTransaction && !this.currentTransaction.committed) {
      return this.currentTransaction.addCommand(command)
    }

    // 否则，执行并添加到撤销栈
    command.execute()
    this.pushToUndo(command)
    return true
  }

  /**
   * 开始批处理模式（用于快速操作，如拖动）
   * 在批处理模式下执行的命令会被分组为单个撤销单元
   * @param name 可选的批处理操作名称
   */
  beginBatch(name?: string): void {
    if (this.batchMode) {
      console.warn('已经在批处理模式中')
      return
    }

    this.batchMode = true
    this.batchCommands = []
    this.batchName = name
  }

  /**
   * 结束批处理模式并将所有命令作为单个撤销单元提交
   * @returns 已提交的批处理命令或空命令
   */
  commitBatch(): ICommand | null {
    if (!this.batchMode) {
      console.warn('不在批处理模式中')
      return null
    }

    this.batchMode = false

    if (this.batchCommands.length === 0) {
      this.batchCommands = []
      this.batchName = undefined
      return null
    }

    const batchCommand = new BatchCommand(this.batchCommands, this.batchName || '批处理操作')

    this.pushToUndo(batchCommand)
    this.batchCommands = []
    this.batchName = undefined

    this.notifyStackChange()

    return batchCommand
  }

  /**
   * 取消批处理模式而不保存
   * 撤销当前批处理中的所有命令
   */
  cancelBatch(): void {
    if (!this.batchMode) {
      return
    }

    // 按相反顺序撤销所有命令
    for (let i = this.batchCommands.length - 1; i >= 0; i--) {
      try {
        this.batchCommands[i].undo()
      } catch (error) {
        console.warn('撤销批处理命令时出错:', error)
      }
    }

    this.batchMode = false
    this.batchCommands = []
    this.batchName = undefined
  }

  /**
   * 检查是否当前在批处理模式中
   */
  isInBatchMode(): boolean {
    return this.batchMode
  }

  /**
   * 检查是否有活动事务
   */
  isInTransaction(): boolean {
    return this.currentTransaction !== null
  }

  /**
   * 获取当前活动事务
   */
  getCurrentTransaction(): Transaction | null {
    return this.currentTransaction
  }

  /**
   * 开始新事务
   * @param name 可选的事务名称
   * @returns 新事务实例
   */
  beginTransaction(name?: string): Transaction {
    if (this.currentTransaction) {
      console.warn('嵌套事务不完全支持，请考虑先提交')
    }

    this.currentTransaction = new Transaction(name)
    return this.currentTransaction
  }

  /**
   * 提交当前事务
   * @returns 已提交的事务或空（如果没有活动事务）
   */
  commitTransaction(): Transaction | null {
    if (!this.currentTransaction) {
      return null
    }

    if (this.currentTransaction.isEmpty()) {
      this.currentTransaction = null
      return null
    }

    // 标记事务为已提交
    this.currentTransaction.committed = true
    const committedTransaction = this.currentTransaction

    // 添加到事务历史
    this.transactionStack.push(committedTransaction)

    // 清除当前事务
    this.currentTransaction = null

    // 作为单个单元推送到撤销栈
    this.pushToUndo(committedTransaction)
    this.notifyStackChange()

    return committedTransaction
  }

  /**
   * 回滚当前事务
   * 撤销事务中的所有命令并丢弃它
   */
  rollbackTransaction(): void {
    if (!this.currentTransaction) {
      return
    }

    try {
      // 撤销所有命令
      this.currentTransaction.undo()
    } catch (error) {
      console.warn('回滚事务时出错:', error)
    } finally {
      // 始终清除当前事务
      this.currentTransaction = null
    }
  }

  /**
   * 撤销最后一个操作
   * @returns 撤销是否成功
   */
  undo(): boolean {
    if (!this.canUndo) {
      return false
    }

    const command = this.undoStack.pop()!

    try {
      command.undo()
      this.redoStack.push(command)
      this.notifyStackChange()
      return true
    } catch (error) {
      console.warn('撤销时出错:', error)
      // 如果撤销失败，将命令恢复到撤销栈
      this.undoStack.push(command)
      return false
    }
  }

  /**
   * 重做最后一个已撤销的操作
   * @returns 重做是否成功
   */
  redo(): boolean {
    if (!this.canRedo) {
      return false
    }

    const command = this.redoStack.pop()!

    try {
      command.execute()
      this.undoStack.push(command)
      this.notifyStackChange()
      return true
    } catch (error) {
      console.warn('重做时出错:', error)
      // 如果重做失败，将命令恢复到重做栈
      this.redoStack.push(command)
      return false
    }
  }

  /**
   * 清除所有历史记录
   * 重置撤销/重做栈并清除任何活动操作
   */
  clear(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.currentTransaction = null
    this.transactionStack.length = 0
    this.batchMode = false
    this.batchCommands.length = 0
    this.batchName = undefined

    this.notifyStackChange()
  }

  /**
   * 获取下一个撤销操作的描述
   */
  getUndoName(): string | null {
    if (!this.canUndo) {
      return null
    }
    return this.undoStack[this.undoStack.length - 1].name
  }

  /**
   * 获取下一个重做操作的描述
   */
  getRedoName(): string | null {
    if (!this.canRedo) {
      return null
    }
    return this.redoStack[this.redoStack.length - 1].name
  }

  /**
   * 将命令推送到撤销栈
   * 处理大小限制并清除重做栈
   * @param command 要推送的命令
   */
  private pushToUndo(command: ICommand): void {
    this.undoStack.push(command)

    // 执行新命令时清除重做栈
    this.redoStack.length = 0

    // 如果超过最大大小，则修剪
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift()
    }

    this.notifyStackChange()
  }

  /**
   * 通知监听器栈变化
   */
  private notifyStackChange(): void {
    if (this.onStackChange) {
      this.onStackChange(this.undoStack.length, this.redoStack.length)
    }
  }
}

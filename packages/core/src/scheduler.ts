export interface SchedulerAction {
  type?: string
  execute(ctx: SchedulerContext): void | Promise<void>
  payload?: any
}
export interface SchedulerContext {
  action: SchedulerAction
  dispatch: (action: SchedulerAction) => void // 分发新的动作
  next: () => void // 放行到下一个动作
}

export type SchedulerMiddleware = (ctx: SchedulerContext) => void | Promise<void>

export function createScheduler() {
  const middlewares: SchedulerMiddleware[] = []

  const result = {
    use,
    dispatch,
  }

  return result

  async function dispatch(action: SchedulerAction) {
    let index = 0

    const ctx = {
      action,
      dispatch,
      next: async () => {
        if (index < middlewares.length) {
          const current = middlewares[index++]
          await current(ctx)
        } else {
          action.execute(ctx)
        }
      },
    }

    await ctx.next()
  }

  function use(middleware: SchedulerMiddleware) {
    middlewares.push(middleware)
    return result
  }
}

export type EventType = string | symbol

// 处理器类型
export type Handler<T> = T extends void ? () => void : (event: T) => void

export type WildcardHandler<Events extends Record<EventType, any>> = <Key extends keyof Events>(
  type: Key,
  event: Events[Key],
) => void

// 内部类型
type AnyHandler = ((event: any) => void) | WildcardHandler<any>
type HandlerList = AnyHandler[]
type EventHandlerMap<Events extends Record<EventType, any>> = Map<keyof Events | '*', HandlerList>

export function createEmitter<Events extends Record<EventType, any> = Record<EventType, any>>(
  all?: EventHandlerMap<Events>,
) {
  const handlersMap: EventHandlerMap<Events> = all || new Map()

  function on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): () => void
  function on(type: '*', handler: WildcardHandler<Events>): () => void
  function on(type: any, handler: AnyHandler) {
    const list = handlersMap.get(type)
    if (list) {
      list.push(handler)
    } else {
      handlersMap.set(type, [handler])
    }
    return () => off(type, handler)
  }

  // off 重载 - handler 可选，不传则清空该类型所有
  function off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void
  function off(type: '*', handler?: WildcardHandler<Events>): void
  function off(type: any, handler?: AnyHandler) {
    if (handler === undefined) {
      // 不传 handler，清空该类型所有
      handlersMap.delete(type)
      return
    }

    const list = handlersMap.get(type)
    if (!list) return

    const idx = list.indexOf(handler)
    if (idx > -1) {
      list.splice(idx, 1)
      if (list.length === 0) {
        handlersMap.delete(type)
      }
    }
  }

  function emit<Key extends keyof Events>(type: Key, ...args: Events[Key] extends void ? [] : [Events[Key]]): void
  function emit(type: any, event?: any) {
    const list = handlersMap.get(type)
    if (list) {
      list.slice().forEach(h => (h as Handler<any>)(event))
    }

    const wilds = handlersMap.get('*')
    if (wilds) {
      wilds.slice().forEach(h => (h as WildcardHandler<any>)(type, event))
    }
  }

  function once<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): () => void
  function once(type: '*', handler: WildcardHandler<Events>): () => void
  function once(type: any, handler: AnyHandler) {
    const wrapped = (evt: any) => {
      off(type, wrapped)
      ;(handler as Handler<any>)(evt)
    }
    return on(type, wrapped)
  }

  function clear(): void {
    handlersMap.clear()
  }

  return {
    get all() {
      return handlersMap
    },

    on,

    off,

    emit,

    once,

    clear,
  }
}

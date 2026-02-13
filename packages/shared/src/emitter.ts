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

// 通过函数重载定义接口
export interface Emitter<Events extends Record<EventType, any>> {
  readonly all: EventHandlerMap<Events>

  // on 重载
  on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): () => void
  on(type: '*', handler: WildcardHandler<Events>): () => void

  // off 重载 - handler 可选，不传则清空该类型所有
  off<Key extends keyof Events>(type: Key, handler?: Handler<Events[Key]>): void
  off(type: '*', handler?: WildcardHandler<Events>): void

  // emit 重载 - void 类型可不传参
  emit<Key extends keyof Events>(type: Key, ...args: Events[Key] extends void ? [] : [Events[Key]]): void

  // once 重载
  once<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): () => void
  once(type: '*', handler: WildcardHandler<Events>): () => void

  clear(): void
}

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
    return () => emitter.off(type, handler)
  }

  const emitter = {
    get all() {
      return handlersMap
    },

    on,

    off(type: any, handler?: AnyHandler) {
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
    },

    emit(type: any, event?: any) {
      const list = handlersMap.get(type)
      if (list) {
        list.slice().forEach(h => (h as Handler<any>)(event))
      }

      const wilds = handlersMap.get('*')
      if (wilds) {
        wilds.slice().forEach(h => (h as WildcardHandler<any>)(type, event))
      }
    },

    once(type: any, handler: AnyHandler) {
      const wrapped = (evt: any) => {
        emitter.off(type, wrapped)
        ;(handler as Handler<any>)(evt)
      }
      return emitter.on(type, wrapped)
    },

    clear() {
      handlersMap.clear()
    },
  }

  return emitter as Emitter<Events>
}

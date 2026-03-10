import type { SetStoreFunction, Store } from 'solid-js/store'
import type { DesignerEmitter, EditorState } from '../types'

export interface DesignerContext {
  state: Store<EditorState>
  setState: SetStoreFunction<EditorState>
  emitter: DesignerEmitter
}

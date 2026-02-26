import type { SetStoreFunction, Store } from 'solid-js/store'
import type { EditorState } from '../index'
import type { Emitter } from '@diagen/shared'

export interface StoreContext {
  state: Store<EditorState>
  setState: SetStoreFunction<EditorState>
  emit: Emitter['emit']
}

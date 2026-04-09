import { deepClone } from '@diagen/shared'
import { unwrap } from 'solid-js/store'

export const unwrapClone = <T>(value: T): T => {
  const raw = unwrap(value)
  if (typeof structuredClone === 'function') {
    return structuredClone(raw)
  }
  return deepClone(raw)
}

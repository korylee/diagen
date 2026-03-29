import { hasOwn } from '../immutable'

export type ClassDictionary = Record<string, unknown>
export type ClassValue = ClassValue[] | ClassDictionary | string | number | null | boolean | undefined

/**
 * 组合 className：
 * - 支持字符串、数字、对象、数组递归
 * - 与 clsx 行为保持一致（忽略 false/null/undefined/0/''）
 */
export function collectClassNames(target: string[], value: ClassValue): void {
  if (!value) return

  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number') {
    target.push(String(value))
    return
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      collectClassNames(target, value[index])
    }
    return
  }

  if (valueType === 'object') {
    const dictionary = value as ClassDictionary
    for (const key in dictionary) {
      if (hasOwn(dictionary, key) && dictionary[key]) {
        target.push(key)
      }
    }
  }
}

export function cx(...inputs: ClassValue[]): string {
  const classNames: string[] = []

  for (let index = 0; index < inputs.length; index++) {
    collectClassNames(classNames, inputs[index])
  }

  return classNames.join(' ')
}

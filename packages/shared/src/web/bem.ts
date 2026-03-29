import { isString } from '../immutable'
import { ClassValue, collectClassNames } from './cx'

export type BemMods = ClassValue

export interface Bem {
  (): string
  (mods: BemMods): string
  (element: string, mods?: BemMods): string
}

function resolveBemMods(base: string, namespaceModPrefix: string, mods?: BemMods): string {
  if (!mods) {
    return base
  }

  const tokens: string[] = []
  collectClassNames(tokens, mods)

  if (tokens.length === 0) {
    return base
  }

  const classNames = tokens.map(mod => {
    if (mod.startsWith(namespaceModPrefix)) {
      return mod
    }

    return `${base}--${mod}`
  })

  return [base, ...classNames].join(' ')
}

/**
 * 创建 BEM 类名生成器
 */
export function createBem(namespace: string, name: string): Bem {
  const prefix = `${namespace}-`
  const modPrefix = `${namespace}--`
  const block = name.startsWith(prefix) ? name : prefix + name

  const bem: Bem = (elementOrMods?: string | BemMods, mods?: BemMods): string => {
    const element = isString(elementOrMods) ? elementOrMods : undefined
    const resolvedMods = isString(elementOrMods) ? mods : elementOrMods
    const base = element ? `${block}__${element}` : block

    return resolveBemMods(base, modPrefix, resolvedMods)
  }

  return bem
}

export const Namespace = 'dg' as const

export function createDgBem(name: string): Bem {
  return createBem(Namespace, name)
}

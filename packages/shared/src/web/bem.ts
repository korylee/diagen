import { isPlainObject, isString } from '../is'

type BemModifierRecord = Record<string, unknown>

export type BemMods = string | BemModifierRecord | false | null | undefined | readonly BemMods[]

export interface Bem {
  (): string
  (mods: BemMods): string
  (element: string, mods?: BemMods): string
}

function isBemModsArray(mods: BemMods): mods is readonly BemMods[] {
  return Array.isArray(mods)
}

function collectBemMods(mods: BemMods, tokens: string[]): void {
  if (!mods) {
    return
  }

  if (isString(mods)) {
    tokens.push(mods)
    return
  }

  if (isBemModsArray(mods)) {
    mods.forEach(item => collectBemMods(item, tokens))
    return
  }

  if (isPlainObject(mods)) {
    Object.keys(mods).forEach(key => {
      if (mods[key]) {
        tokens.push(key)
      }
    })
  }
}

function resolveBemMods(base: string, namespaceModPrefix: string, mods?: BemMods): string {
  if (!mods) {
    return base
  }

  const tokens: string[] = []
  collectBemMods(mods, tokens)

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

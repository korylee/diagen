import { isArray, isPlainObject, isString } from './is'
import { MaybeArray } from './types'

type Mods = MaybeArray<string | Record<string, any>>

function genBem(mods: Mods | undefined, generate: (mod: string) => string): string {
  if (!mods) return ''

  if (isString(mods)) return generate(mods)

  if (isArray(mods)) {
    return mods.map(item => genBem(item, generate)).join('')
  }

  if (isPlainObject(mods)) {
    return Object.keys(mods)
      .filter(key => mods[key])
      .map(key => generate(key))
      .join(' ')
  }

  return ''
}

export function createBem(namespace: string, name: string) {
  const prefix = `${namespace}-`
  const modPrefix = `${namespace}--`
  const block = name.indexOf(prefix) === 0 ? name : prefix + name
  function bem(el?: Mods, mods?: Mods) {
    if (el && !isString(el)) {
      mods = el
      el = undefined
    }
    const base = el ? `${block}__${el}` : block

    const affix = genBem(mods, (mod: string) => {
      if (mod[0] === '$') return ` ${namespace}${mod.slice(1)}`
      if (mod.indexOf(modPrefix) === 0) return ` ${mod}`
      return ` ${base}--${mod}`
    })

    return base + affix
  }
  return bem
}

export type BEM = ReturnType<typeof createBem>

export function genCreateNamespace<N extends string>(namespace: N) {
  return function createNamespace<K extends string>(name: K) {
    const componentName = `${namespace}-${name}` as const
    return [componentName, createBem(namespace, componentName)] as const
  }
}

import { ensureArray } from '@diagen/shared'
import { onCleanup, onMount } from 'solid-js'

export type KeyCombo = string | string[]

interface Binding {
  keys: string[][]
  action: () => void
}

// ============================================================================
// 修饰键处理
// ============================================================================
const MODIFIER_ALIASES = {
  control: 'ctrl',
  cmd: 'meta',
  command: 'meta',
  mod: 'ctrl', // Windows: ctrl, Mac: meta
  shift: 'shift',
  meta: 'meta',
  alt: 'alt',
} as const

type Modifier = typeof MODIFIER_ALIASES[keyof typeof MODIFIER_ALIASES]

const MODIFIER_STATE: Record<Modifier, (e: KeyboardEvent) => boolean> = {
  ctrl: e => e.ctrlKey,
  alt: e => e.altKey,
  shift: e => e.shiftKey,
  meta: e => e.metaKey,
}

const isModifier = (key: string): key is Modifier => key in MODIFIER_STATE

const normalizeKey = (key: string): string => (MODIFIER_ALIASES as any)[key] ?? key

// ============================================================================
// 按键解析
// ============================================================================

/** 解析单个组合键，如 'ctrl+shift+f' -> ['ctrl', 'shift', 'f'] */
function parseCombo(combo: string): string[] {
  return combo
    .trim()
    .toLowerCase()
    .split('+')
    .map(k => k.trim())
    .filter(Boolean)
    .map(normalizeKey)
}

/** 解析按键序列，如 'up up down down' -> [['up'], ['up'], ['down'], ['down']] */
function parseKeys(key: KeyCombo): string[][] {
  return ensureArray(key).flatMap(combo => combo.trim().split(/\s+/).map(parseCombo))
}

// ============================================================================
// 按键匹配
// ============================================================================

/** 检查按键事件是否匹配组合键 */
function matchCombo(e: KeyboardEvent, combo: string[]): boolean {
  const requiredMods: Modifier[] = []
  let requiredKey: string | undefined

  // 分离修饰键和主键
  for (const key of combo) {
    if (isModifier(key)) {
      requiredMods.push(key)
    } else {
      requiredKey = key
    }
  }

  // 验证所有必需修饰键已按下
  for (const mod of requiredMods) {
    if (!MODIFIER_STATE[mod](e)) return false
  }

  // 验证没有多余修饰键按下
  const allMods: Modifier[] = ['ctrl', 'alt', 'shift', 'meta']
  for (const mod of allMods) {
    if (!requiredMods.includes(mod) && MODIFIER_STATE[mod](e)) {
      return false
    }
  }

  // 无主键时仅检查修饰键（如单独 ctrl）
  if (!requiredKey) return true

  // 匹配主键
  const eventKey = e.key.toLowerCase()
  return eventKey === requiredKey || e.code.toLowerCase() === requiredKey
}

// ============================================================================
// Hook 实现
// ============================================================================

const defaultWindow = window

export function useKeyboard(options: { enabled?: () => boolean; window?: EventTarget } = {}) {
  const { enabled = () => true, window = defaultWindow } = options

  const bindings = new Map<string, Binding>()
  let sequence: string[][] = []
  let sequenceTimer: ReturnType<typeof setTimeout> | null = null
  const SEQUENCE_TIMEOUT = 1000 // 按键序列超时时间

  const getBindingKey = (keys: string[][]): string => keys.map(combo => combo.join('+')).join(' ')

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!enabled()) return

    // 收集当前按键的所有可能组合
    const currentCombo = [
      ...(e.ctrlKey ? ['ctrl'] : []),
      ...(e.shiftKey ? ['shift'] : []),
      ...(e.altKey ? ['alt'] : []),
      ...(e.metaKey ? ['meta'] : []),
      e.key.toLowerCase(),
    ]

    // 更新序列
    clearTimeout(sequenceTimer!)
    sequence.push(currentCombo)
    sequenceTimer = setTimeout(() => {
      sequence = []
    }, SEQUENCE_TIMEOUT)

    // 查找匹配的绑定
    for (const binding of bindings.values()) {
      const { keys, action } = binding

      // 单组合键匹配
      if (keys.length === 1 && matchCombo(e, keys[0])) {
        e.preventDefault()
        action()
        sequence = []
        return
      }

      // 序列匹配
      if (keys.length > 1) {
        const seqLen = keys.length
        const recentSeq = sequence.slice(-seqLen)
        if (
          recentSeq.length === seqLen &&
          recentSeq.every((combo, i) => combo.length === keys[i].length && combo.every(k => keys[i].includes(k)))
        ) {
          e.preventDefault()
          action()
          sequence = []
          return
        }
      }
    }
  }

  const bind = (key: KeyCombo, action: () => void): (() => void) => {
    const keys = parseKeys(key)
    const id = getBindingKey(keys)
    bindings.set(id, { keys, action })
    return () => bindings.delete(id)
  }

  const unbind = (key: KeyCombo): void => {
    const keys = parseKeys(key)
    const id = getBindingKey(keys)
    bindings.delete(id)
  }

  const trigger = (key: KeyCombo): void => {
    const keys = parseKeys(key)
    const id = getBindingKey(keys)
    const binding = bindings.get(id)
    if (binding) binding.action()
  }

  const reset = (): void => {
    bindings.clear()
    sequence = []
  }

  onMount(() => window.addEventListener('keydown', handleKeyDown as EventListener))
  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown as EventListener)
    clearTimeout(sequenceTimer!)
  })

  return { bind, unbind, trigger, reset }
}

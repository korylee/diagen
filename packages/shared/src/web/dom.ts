import { isNumeric } from '../immutable'

export function toUnit(str: string | number | null | undefined, unit = 'px'): string | undefined {
  if (str == null || str === '') return undefined
  if (isNumeric(str)) return `${Number(str)}${unit}`
  if (isNaN(+str)) return str
  if (!isFinite(+str)) return undefined
  return `${Number(str)}${unit}`
}

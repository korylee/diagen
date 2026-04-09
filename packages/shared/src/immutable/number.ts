export const clamp = (num: number, min: number, max: number) => Math.max(min, Math.min(max, num))

export const isSameNumber = (a: number, b: number) => Math.abs(a - b) <= 1e-6

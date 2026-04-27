export function createPreviewLineWidth(scale: number): number {
  return 2 / Math.max(scale, 0.001)
}

export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith('#')) {
    if (color.length === 4) {
      const r = Number.parseInt(color[1] + color[1], 16)
      const g = Number.parseInt(color[2] + color[2], 16)
      const b = Number.parseInt(color[3] + color[3], 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    if (color.length === 7) {
      const r = Number.parseInt(color.slice(1, 3), 16)
      const g = Number.parseInt(color.slice(3, 5), 16)
      const b = Number.parseInt(color.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
  }

  if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
  }

  return color
}

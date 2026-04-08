import type { Point } from '@diagen/shared'

export function createRoutePath(points: Point[], linkerType: string): string {
  if (points.length < 2) return ''

  if (linkerType === 'curved' && points.length === 4) {
    return `M ${points[0].x} ${points[0].y} C ${points[1].x} ${points[1].y}, ${points[2].x} ${points[2].y}, ${points[3].x} ${points[3].y}`
  }

  const commands = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 1; i < points.length; i++) {
    commands.push(`L ${points[i].x} ${points[i].y}`)
  }
  return commands.join(' ')
}

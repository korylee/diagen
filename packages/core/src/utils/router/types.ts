import type { Point, Rect } from '@diagen/shared'

export interface RouterConfig {
  gridSize: number
  padding: number
  maxIterations: number
  diagonalCost: number
  orthogonalCost: number
}

export interface Obstacle {
  id: string
  bounds: Rect
  padding: number
}

export interface RouteResult {
  points: Point[]
  success: boolean
  cost?: number
}

export interface RouterContext {
  obstacles: Obstacle[]
  bounds: Rect
  config: RouterConfig
}

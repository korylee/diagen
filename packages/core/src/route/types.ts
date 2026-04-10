import type { Point, Bounds } from '@diagen/shared'

export interface RouteConfig {
  gridSize: number
  padding: number
  maxIterations: number
  diagonalCost: number
  orthogonalCost: number
}

export interface Obstacle {
  id: string
  bounds: Bounds
  padding: number
}

export interface RouteResult {
  points: Point[]
  success: boolean
  cost?: number
}

export interface RouteContext {
  obstacles: Obstacle[]
  bounds: Bounds
  config: RouteConfig
}

import { describe, expect, it } from 'vitest'
import { aStarRoute, findRoute, createObstacleFromRect } from '../astar'
import { orthogonalRoute, findOrthogonalRoute } from '../orthogonal'
import { route, createObstaclesFromElements, calculateRoutePoints } from '../index'
import {
  expandRect,
  snapToGrid,
  manhattanDistance,
  euclideanDistance,
  simplifyOrthogonalPath,
  calculateRouteCost,
  isRouteValid,
} from '../utils'
import type { Obstacle, RouterConfig } from '../types'
import type { Rect, Point } from '@diagen/shared'

const defaultConfig: RouterConfig = {
  gridSize: 10,
  padding: 15,
  maxIterations: 5000,
  diagonalCost: 1.414,
  orthogonalCost: 1,
}

function createObstacle(x: number, y: number, w: number, h: number, padding = 10): Obstacle {
  return {
    id: `obs-${x}-${y}`,
    bounds: { x, y, w, h },
    padding,
  }
}

describe('utils', () => {
  describe('expandRect', () => {
    it('应正确扩展矩形边界', () => {
      const rect: Rect = { x: 10, y: 20, w: 100, h: 50 }
      const expanded = expandRect(rect, 5)
      expect(expanded).toEqual({ x: 5, y: 15, w: 110, h: 60 })
    })
  })

  describe('snapToGrid', () => {
    it('应将值对齐到网格', () => {
      expect(snapToGrid(12, 10)).toBe(10)
      expect(snapToGrid(15, 10)).toBe(20)
      expect(snapToGrid(20, 10)).toBe(20)
    })
  })

  describe('manhattanDistance', () => {
    it('应正确计算曼哈顿距离', () => {
      const p1: Point = { x: 0, y: 0 }
      const p2: Point = { x: 30, y: 40 }
      expect(manhattanDistance(p1, p2)).toBe(70)
    })
  })

  describe('euclideanDistance', () => {
    it('应正确计算欧几里得距离', () => {
      const p1: Point = { x: 0, y: 0 }
      const p2: Point = { x: 30, y: 40 }
      expect(euclideanDistance(p1, p2)).toBe(50)
    })
  })

  describe('simplifyOrthogonalPath', () => {
    it('应移除共线的冗余点', () => {
      const path: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 20, y: 20 },
      ]
      const simplified = simplifyOrthogonalPath(path)
      expect(simplified).toHaveLength(3)
      expect(simplified).toEqual([
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 20 },
      ])
    })

    it('当路径长度小于等于2时应原样返回', () => {
      const path: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 10 }]
      expect(simplifyOrthogonalPath(path)).toEqual(path)
    })
  })

  describe('calculateRouteCost', () => {
    it('应正确计算包含拐点的路由成本', () => {
      const route: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 50 },
      ]
      const cost = calculateRouteCost(route, 10)
      expect(cost).toBe(100 + 50 + 10)
    })
  })

  describe('isRouteValid', () => {
    it('有效路由应返回 true', () => {
      const route: Point[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }]
      const obstacles = [createObstacle(50, 50, 20, 20)]
      expect(isRouteValid(route, obstacles)).toBe(true)
    })

    it('穿过障碍物的路由应返回 false', () => {
      const route: Point[] = [{ x: 0, y: 60 }, { x: 100, y: 60 }]
      const obstacles = [createObstacle(40, 50, 30, 20)]
      expect(isRouteValid(route, obstacles)).toBe(false)
    })
  })
})

describe('astar', () => {
  describe('aStarRoute', () => {
    it('无障碍物时应找到直线路由', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 0 }
      const result = aStarRoute(from, to, [], defaultConfig)
      expect(result.success).toBe(true)
      expect(result.points.length).toBeGreaterThanOrEqual(2)
    })

    it('应找到绕过障碍物的路由', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 200, y: 0 }
      const obstacles = [createObstacle(80, -30, 40, 60, 5)]
      const result = aStarRoute(from, to, obstacles, defaultConfig)
      expect(result.success).toBe(true)
      expect(result.points.length).toBeGreaterThanOrEqual(2)
    })

    it('应正确响应拐点惩罚参数', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 100 }
      const result1 = aStarRoute(from, to, [], defaultConfig, { bendPenalty: 5 })
      const result2 = aStarRoute(from, to, [], defaultConfig, { bendPenalty: 50 })
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
    })
  })

  describe('createObstacleFromRect', () => {
    it('应从矩形创建障碍物', () => {
      const rect: Rect = { x: 10, y: 20, w: 100, h: 50 }
      const obstacle = createObstacleFromRect('test', rect, 15)
      expect(obstacle.id).toBe('test')
      expect(obstacle.bounds).toEqual(rect)
      expect(obstacle.padding).toBe(15)
    })
  })
})

describe('orthogonal', () => {
  describe('orthogonalRoute', () => {
    it('无障碍物时应找到直线路由', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 0 }
      const result = orthogonalRoute(from, to, [], defaultConfig)
      expect(result.success).toBe(true)
      expect(result.points).toHaveLength(2)
    })

    it('应找到对角线路径的路由', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 100 }
      const result = orthogonalRoute(from, to, [], defaultConfig)
      expect(result.success).toBe(true)
      expect(result.points.length).toBeGreaterThanOrEqual(2)
    })

    it('应找到绕过障碍物的路由', () => {
      const from: Point = { x: 0, y: 50 }
      const to: Point = { x: 200, y: 50 }
      const obstacles = [createObstacle(80, 40, 40, 30)]
      const result = orthogonalRoute(from, to, obstacles, defaultConfig)
      expect(result.success).toBe(true)
      expect(isRouteValid(result.points, obstacles)).toBe(true)
    })

    it('应遵循起始方向约束', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 100 }
      const result = orthogonalRoute(from, to, [], defaultConfig, { startDirection: 'h' })
      expect(result.success).toBe(true)
      if (result.points.length >= 2) {
        const dx = result.points[1].x - result.points[0].x
        const dy = result.points[1].y - result.points[0].y
        expect(Math.abs(dx)).toBeGreaterThan(0)
      }
    })
  })
})

describe('router index', () => {
  describe('route', () => {
    it('默认应使用混合算法', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 100 }
      const result = route(from, to, [])
      expect(result.success).toBe(true)
    })

    it('应支持 A* 算法', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 100 }
      const result = route(from, to, [], {}, { algorithm: 'astar' })
      expect(result.success).toBe(true)
    })

    it('应支持正交算法', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 100 }
      const result = route(from, to, [], {}, { algorithm: 'orthogonal' })
      expect(result.success).toBe(true)
    })
  })

  describe('createObstaclesFromElements', () => {
    it('应从图形元素创建障碍物', () => {
      const elements = [
        {
          id: 'shape1',
          type: 'shape',
          props: { x: 10, y: 20, w: 100, h: 50, fill: '#fff' },
        },
        {
          id: 'shape2',
          type: 'shape',
          props: { x: 200, y: 100, w: 80, h: 60, fill: '#000' },
        },
      ] as any

      const obstacles = createObstaclesFromElements(elements)
      expect(obstacles).toHaveLength(2)
      expect(obstacles[0].id).toBe('shape1')
      expect(obstacles[1].id).toBe('shape2')
    })

    it('应排除指定 ID 的元素', () => {
      const elements = [
        { id: 'shape1', type: 'shape', props: { x: 10, y: 20, w: 100, h: 50 } },
        { id: 'shape2', type: 'shape', props: { x: 200, y: 100, w: 80, h: 60 } },
      ] as any

      const obstacles = createObstaclesFromElements(elements, ['shape1'])
      expect(obstacles).toHaveLength(1)
      expect(obstacles[0].id).toBe('shape2')
    })
  })

  describe('calculateRoutePoints', () => {
    it('应计算两点之间的路由点', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 200, y: 0 }
      const elements = [
        { id: 'block', type: 'shape', props: { x: 80, y: -20, w: 40, h: 40 } },
      ] as any

      const points = calculateRoutePoints(from, to, elements)
      expect(points.length).toBeGreaterThanOrEqual(2)
      expect(points[0]).toEqual(from)
      expect(points[points.length - 1]).toEqual(to)
    })
  })
})

describe('integration', () => {
  it('应在复杂场景中找到路由', () => {
    const from: Point = { x: 50, y: 50 }
    const to: Point = { x: 350, y: 350 }
    const obstacles: Obstacle[] = [
      createObstacle(100, 100, 80, 80),
      createObstacle(200, 150, 60, 100),
      createObstacle(150, 250, 100, 60),
    ]

    const result = route(from, to, obstacles, defaultConfig)
    expect(result.success).toBe(true)
    expect(isRouteValid(result.points, obstacles)).toBe(true)
  })

  it('应处理起点等于终点的情况', () => {
    const point: Point = { x: 50, y: 50 }
    const result = route(point, point, [])
    expect(result.success).toBe(true)
    expect(result.points).toHaveLength(2)
  })

  it('应处理多个障碍物阻挡直线路径的情况', () => {
    const from: Point = { x: 0, y: 100 }
    const to: Point = { x: 300, y: 100 }
    const obstacles: Obstacle[] = [
      createObstacle(50, 80, 40, 50),
      createObstacle(120, 70, 40, 60),
      createObstacle(190, 85, 40, 40),
    ]

    const astarResult = aStarRoute(from, to, obstacles, defaultConfig)
    const orthoResult = orthogonalRoute(from, to, obstacles, defaultConfig)

    expect(astarResult.success || orthoResult.success).toBe(true)
  })
})

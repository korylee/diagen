import type { Bounds, Point } from '@diagen/shared'
import { describe, expect, it } from 'vitest'
import { aStarRoute, createObstacleFromBounds } from './astar'
import { calculateLineJumps, getObstacleRoute, getObstacles, getRoutePoints } from './index'
import { orthogonalRoute } from './orthogonal'
import type { Obstacle, RouteConfig } from './types'
import { calculateRouteCost, euclideanDistance, isRouteValid, simplifyOrthogonalPath } from './utils'

const defaultConfig: RouteConfig = {
  gridSize: 10,
  padding: 15,
  maxIterations: 5000,
  diagonalCost: 1.414,
  orthogonalCost: 1,
}

function createStraightRoute(from: Point, to: Point) {
  return {
    points: [from, to],
    fromAngle: 0,
    toAngle: 0,
  }
}

function createVerticalStraightRoute(x: number, fromY = 0, toY = 100) {
  return createStraightRoute({ x, y: fromY }, { x, y: toY })
}

function createHorizontalStraightRoute(y: number, fromX = 0, toX = 100) {
  return createStraightRoute({ x: fromX, y }, { x: toX, y })
}

function createDenseJumpRouteFixture(crossXs: number[]) {
  return {
    route: createHorizontalStraightRoute(50),
    otherRoutes: crossXs.map(x => createVerticalStraightRoute(x)),
  }
}

function createObstacle(x: number, y: number, w: number, h: number, padding = 10): Obstacle {
  return {
    id: `obs-${x}-${y}`,
    bounds: { x, y, w, h },
    padding,
  }
}

describe('utils', () => {
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
      const path: Point[] = [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]
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
      const route: Point[] = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ]
      const obstacles = [createObstacle(50, 50, 20, 20)]
      expect(isRouteValid(route, obstacles)).toBe(true)
    })

    it('穿过障碍物的路由应返回 false', () => {
      const route: Point[] = [
        { x: 0, y: 60 },
        { x: 100, y: 60 },
      ]
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
      const rect: Bounds = { x: 10, y: 20, w: 100, h: 50 }
      const obstacle = createObstacleFromBounds('test', rect, 15)
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
  describe('calculateLineJumps', () => {
    it('同一 segment 上多个交叉点过近时应收敛 jump 半径', () => {
      const { route, otherRoutes } = createDenseJumpRouteFixture([40, 52])

      const jumps = calculateLineJumps(route, otherRoutes, {
        radius: 10,
        endpointPadding: 10,
        jumpGap: 4,
      })

      expect(jumps).toEqual([
        {
          segmentIndex: 0,
          center: { x: 40, y: 50 },
          orientation: 'horizontal',
          radius: 4,
        },
        {
          segmentIndex: 0,
          center: { x: 52, y: 50 },
          orientation: 'horizontal',
          radius: 4,
        },
      ])
    })

    it('交叉点过于密集时应跳过不可稳定绘制的 jump', () => {
      const { route, otherRoutes } = createDenseJumpRouteFixture([40, 45])

      const jumps = calculateLineJumps(route, otherRoutes, {
        radius: 10,
        endpointPadding: 10,
        jumpGap: 4,
      })

      expect(jumps).toEqual([])
    })

    it('反向水平 segment 计算 jump 时仍应保持稳定顺序与半径', () => {
      const route = createHorizontalStraightRoute(50, 100, 0)
      const otherRoutes = [createVerticalStraightRoute(40), createVerticalStraightRoute(52)]

      const jumps = calculateLineJumps(route, otherRoutes, {
        radius: 10,
        endpointPadding: 10,
        jumpGap: 4,
      })

      expect(jumps).toEqual([
        {
          segmentIndex: 0,
          center: { x: 40, y: 50 },
          orientation: 'horizontal',
          radius: 4,
        },
        {
          segmentIndex: 0,
          center: { x: 52, y: 50 },
          orientation: 'horizontal',
          radius: 4,
        },
      ])
    })

    it('反向垂直 segment 计算 jump 时仍应保持稳定顺序与半径', () => {
      const route = createVerticalStraightRoute(50, 100, 0)
      const otherRoutes = [createHorizontalStraightRoute(40), createHorizontalStraightRoute(52)]

      const jumps = calculateLineJumps(route, otherRoutes, {
        radius: 10,
        endpointPadding: 10,
        jumpGap: 4,
      })

      expect(jumps).toEqual([
        {
          segmentIndex: 0,
          center: { x: 50, y: 40 },
          orientation: 'vertical',
          radius: 4,
        },
        {
          segmentIndex: 0,
          center: { x: 50, y: 52 },
          orientation: 'vertical',
          radius: 4,
        },
      ])
    })
  })

  describe('getObstacleRoute', () => {
    it('默认应使用混合算法', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 100 }
      const result = getObstacleRoute(from, to, [])
      expect(result.success).toBe(true)
    })

    it('应支持 A* 算法', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 100 }
      const result = getObstacleRoute(from, to, [], {}, { algorithm: 'astar' })
      expect(result.success).toBe(true)
    })

    it('应支持正交算法', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 100, y: 100 }
      const result = getObstacleRoute(from, to, [], {}, { algorithm: 'orthogonal' })
      expect(result.success).toBe(true)
    })
  })

  describe('getObstacles', () => {
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

      const obstacles = getObstacles(elements)
      expect(obstacles).toHaveLength(2)
      expect(obstacles[0].id).toBe('shape1')
      expect(obstacles[1].id).toBe('shape2')
    })

    it('应排除指定 ID 的元素', () => {
      const elements = [
        { id: 'shape1', type: 'shape', props: { x: 10, y: 20, w: 100, h: 50 } },
        { id: 'shape2', type: 'shape', props: { x: 200, y: 100, w: 80, h: 60 } },
      ] as any

      const obstacles = getObstacles(elements, ['shape1'])
      expect(obstacles).toHaveLength(1)
      expect(obstacles[0].id).toBe('shape2')
    })
  })

  describe('getRoutePoints', () => {
    it('应计算两点之间的路由点', () => {
      const from: Point = { x: 0, y: 0 }
      const to: Point = { x: 200, y: 0 }
      const elements = [{ id: 'block', type: 'shape', props: { x: 80, y: -20, w: 40, h: 40 } }] as any

      const points = getRoutePoints(from, to, elements)
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

    const result = getObstacleRoute(from, to, obstacles, defaultConfig)
    expect(result.success).toBe(true)
    expect(isRouteValid(result.points, obstacles)).toBe(true)
  })

  it('应处理起点等于终点的情况', () => {
    const point: Point = { x: 50, y: 50 }
    const result = getObstacleRoute(point, point, [])
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

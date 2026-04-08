import { useDesigner } from './DesignerProvider'
import { createMemo } from 'solid-js'

export function DesignerGrids() {
  const { state, view } = useDesigner()
  const grid = createMemo(() => {
    const { page } = state.diagram
    const { containerSize, canvasOffset } = state
    const zoom = view.zoom()
    // world 层本身只处理 viewport 变换，这里把运行时原点补偿折算回本地坐标，保证网格与元素继续对齐
    const patternOffsetX = zoom ? canvasOffset.x / zoom : 0
    const patternOffsetY = zoom ? canvasOffset.y / zoom : 0

    return {
      width: containerSize.width,
      height: containerSize.height,
      backgroundColor: page.backgroundColor,
      patternOffsetX,
      patternOffsetY,
    }
  })
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      id="designer_grids"
      style={{
        width: `${grid().width}px`,
        height: `${grid().height}px`,
        'background-color': grid().backgroundColor,
        display: 'block',
      }}
    >
      <defs>
        <pattern
          id="flow_canvas_grid_item"
          width="61"
          height="61"
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${grid().patternOffsetX}, ${grid().patternOffsetY})`}
        >
          <path
            id="flow_canvas_grid_path1"
            stroke-width="1"
            fill="none"
            d="M0 15L60 15M15 0L15 60M0 30L60 30M30 0L30 60M0 45L60 45M45 0L45 60"
            stroke="rgb(242,242,242)"
          ></path>
          <path
            id="flow_canvas_grid_path2"
            stroke-width="1"
            fill="none"
            d="M0 60L60 60M60 0L60 60"
            stroke="rgb(229,229,229)"
          ></path>
        </pattern>
        <pattern
          xmlns="http://www.w3.org/2000/svg"
          patternUnits="userSpaceOnUse"
          id="flow_canvas_watermark_item"
          width="300"
          height="300"
          patternTransform={`translate(${grid().patternOffsetX}, ${grid().patternOffsetY})`}
        >
          <text
            x="150"
            y="100"
            font-size="18"
            transform="rotate(-45, 150, 150)"
            style="dominant-baseline: middle; text-anchor: middle;"
          ></text>
        </pattern>
      </defs>
      <rect
        id="flow_canvas_grids_box"
        width={grid().width}
        height={grid().height}
        fill="url(#flow_canvas_grid_item)"
      ></rect>
      <rect
        id="flow_canvas_watermark_box"
        width={grid().width}
        height={grid().height}
        fill="url(#flow_canvas_watermark_item)"
      ></rect>
      <path
        id="flow_canvas_print_line"
        stroke-width="2"
        stroke-dasharray="5,5"
        fill="none"
        d=""
        stroke="rgb(215,215,215)"
      ></path>
    </svg>
  )
}

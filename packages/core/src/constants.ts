import { ValueOf } from '@diagen/shared'
import {
  DEFAULT_ANCHORS,
  DEFAULT_ATTRIBUTE,
  DEFAULT_FILL_STYLE,
  DEFAULT_FONT_STYLE,
  DEFAULT_LINE_STYLE,
  DEFAULT_TEXT_BLOCK,
  RECTANGLE_PATH,
} from './schema/defaults'

export const ElementType = {
  SHAPE: 'shape',
  LINKER: 'linker',
  TEXT: 'text',
  IMAGE: 'image',
  GRID: 'grid',
} as const
export type ElementType = ValueOf<typeof ElementType>

export const ShapeCategory = {
  STANDARD: 'standard',
  BASIC: 'basic',
  FLOW: 'flow',
  LANE: 'lane',
  UML: 'uml',
  CUSTOM: 'custom',
} as const
export type ShapeCategory = ValueOf<typeof ShapeCategory>

export const LinkerType = {
  BROKEN: 'broken',
  STRAIGHT: 'straight',
  CURVED: 'curved',
  ORTHOGONAL: 'orthogonal',
} as const
export type LinkerType = ValueOf<typeof LinkerType>

export const ArrowStyle = {
  NONE: 'none',
  SOLID_ARROW: 'solidArrow',
  DIAMOND: 'diamond',
  CIRCLE: 'circle',
  OPEN_ARROW: 'openArrow',
} as const
export type ArrowStyle = ValueOf<typeof ArrowStyle>

export const LineStyleType = {
  SOLID: 'solid',
  DASHED: 'dashed',
  DOTTED: 'dotted',
} as const
export type LineStyleType = ValueOf<typeof LineStyleType>

export const FillType = {
  NONE: 'none',
  SOLID: 'solid',
  GRADIENT: 'gradient',
  IMAGE: 'image',
} as const
export type FillType = ValueOf<typeof FillType>

export const GradientType = {
  LINEAR: 'linear',
  RADIAL: 'radial',
} as const
export type GradientType = ValueOf<typeof GradientType>

export const TextAlign = {
  LEFT: 'left',
  CENTER: 'center',
  RIGHT: 'right',
} as const
export type TextAlign = ValueOf<typeof TextAlign>

export const VerticalAlign = {
  TOP: 'top',
  MIDDLE: 'middle',
  BOTTOM: 'bottom',
} as const
export type VerticalAlign = ValueOf<typeof VerticalAlign>

export const TextOrientation = {
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
} as const
export type TextOrientation = ValueOf<typeof TextOrientation>

export const DEFAULTS = {
  grid: {
    size: 15,
    color: '#e0e0e0',
    show: true,
  },

  zoom: {
    default: 1,
    min: 0.1,
    max: 5,
    step: 0.1,
  },

  page: {
    width: 1050,
    height: 1000,
    background: 'rgb(255, 255, 255)',
    padding: 20,
    margin: 800,
    lineJumps: false,
    gridStyle: 'line',
    orientation: 'portrait',
  },

  shape: {
    width: 120,
    height: 80,
    anchors: DEFAULT_ANCHORS,
    path: RECTANGLE_PATH,
    textBlock: DEFAULT_TEXT_BLOCK,
    attribute: DEFAULT_ATTRIBUTE,
  },

  style: {
    line: DEFAULT_LINE_STYLE,
    font: DEFAULT_FONT_STYLE,
    fill: DEFAULT_FILL_STYLE,
  },

  editor: {
    anchorSize: 8,
    rotaterSize: 9,
    anchorColor: '#067bef',
    selectorColor: '#067bef',
    containerInset: 800,
  },

  autoGrow: {
    enabled: true,
    growPadding: 240,
    growStep: 200,
    maxWidth: 20000,
    maxHeight: 20000,
    shrink: false,
    shrinkPadding: 320,
  },

  linker: {
    strategies: {
      [LinkerType.BROKEN]: 'obstacle',
      [LinkerType.ORTHOGONAL]: 'obstacle',
      [LinkerType.STRAIGHT]: 'basic',
      [LinkerType.CURVED]: 'basic',
    },
    obstacleConfig: { padding: 15 },
    obstacleOptions: { algorithm: 'hybrid' },
    lineJumpRadius: 10,
  },

  performance: {
    lineJumpsLimit: 400,
  },
} as const

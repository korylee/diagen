import type { LineStyle, FillStyle, FontStyle, ElementAttribute, Anchor, PathDefinition, TextBlock } from '../model';

export const DEFAULT_LINE_STYLE: LineStyle = {
  lineWidth: 2,
  lineColor: '50,50,50',
  lineStyle: 'solid',
  beginArrowStyle: 'none',
  endArrowStyle: 'solidArrow',
};

export const DEFAULT_FILL_STYLE: FillStyle = {
  type: 'solid',
  color: '255,255,255',
};

export const DEFAULT_FONT_STYLE: FontStyle = {
  fontFamily: 'Arial, sans-serif',
  size: 13,
  color: '50,50,50',
  bold: false,
  italic: false,
  underline: false,
  textAlign: 'center',
  vAlign: 'middle',
  lineHeight: 1.25,
};

export const DEFAULT_ATTRIBUTE: ElementAttribute = {
  container: false,
  visible: true,
  rotatable: true,
  linkable: true,
  collapsable: false,
  collapsed: false,
  markerOffset: 0,
  resizable: true,
  movable: true,
};

export const DEFAULT_ANCHORS: Anchor[] = [
  { x: 'w/2', y: '0' },
  { x: 'w', y: 'h/2' },
  { x: 'w/2', y: 'h' },
  { x: '0', y: 'h/2' },
];

export const DEFAULT_TEXT_BLOCK: TextBlock = {
  position: { x: 10, y: 0, w: 'w-20', h: 'h' },
  text: '',
};

export const RECTANGLE_PATH: PathDefinition[] = [
  {
    actions: [
      { action: 'move', x: '0', y: '0' },
      { action: 'line', x: 'w', y: '0' },
      { action: 'line', x: 'w', y: 'h' },
      { action: 'line', x: '0', y: 'h' },
      { action: 'close' },
    ],
  },
];

export const ROUNDED_RECTANGLE_PATH: PathDefinition[] = [
  {
    actions: [
      { action: 'move', x: '10', y: '0' },
      { action: 'quadraticCurve', x: 'w', y: '0', x1: 'w-10', y1: '0' },
      { action: 'quadraticCurve', x: 'w', y: 'h', x1: 'w', y1: '10' },
      { action: 'quadraticCurve', x: '0', y: 'h', x1: '10', y1: 'h' },
      { action: 'quadraticCurve', x: '0', y: '0', x1: '0', y1: 'h-10' },
      { action: 'close' },
    ],
  },
];

export const CIRCLE_PATH: PathDefinition[] = [
  {
    actions: [
      { action: 'move', x: 'w/2', y: '0' },
      { action: 'curve', x: 'w', y: 'h/2', x1: 'w', y1: '0', x2: 'w', y2: 'h/2' },
      { action: 'curve', x: 'w/2', y: 'h', x1: 'w', y1: 'h', x2: 'w/2', y2: 'h' },
      { action: 'curve', x: '0', y: 'h/2', x1: '0', y1: 'h', x2: '0', y2: 'h/2' },
      { action: 'curve', x: 'w/2', y: '0', x1: '0', y1: '0', x2: '0', y2: '0' },
      { action: 'close' },
    ],
  },
];

export const DIAMOND_PATH: PathDefinition[] = [
  {
    actions: [
      { action: 'move', x: 'w/2', y: '0' },
      { action: 'line', x: 'w', y: 'h/2' },
      { action: 'line', x: 'w/2', y: 'h' },
      { action: 'line', x: '0', y: 'h/2' },
      { action: 'close' },
    ],
  },
];

export const PARALLELOGRAM_PATH: PathDefinition[] = [
  {
    actions: [
      { action: 'move', x: '20', y: '0' },
      { action: 'line', x: 'w', y: '0' },
      { action: 'line', x: 'w-20', y: 'h' },
      { action: 'line', x: '0', y: 'h' },
      { action: 'close' },
    ],
  },
];

export const ELLIPSE_PATH: PathDefinition[] = [
  {
    actions: [
      { action: 'move', x: 'w/2', y: '0' },
      { action: 'curve', x: 'w', y: 'h/2', x1: 'w*0.75', y1: '0', x2: 'w', y2: 'h*0.25' },
      { action: 'curve', x: 'w/2', y: 'h', x1: 'w', y1: 'h*0.75', x2: 'w*0.75', y2: 'h' },
      { action: 'curve', x: '0', y: 'h/2', x1: 'w*0.25', y1: 'h', x2: '0', y2: 'h*0.75' },
      { action: 'curve', x: 'w/2', y: '0', x1: '0', y1: 'h*0.25', x2: 'w*0.25', y2: '0' },
      { action: 'close' },
    ],
  },
];

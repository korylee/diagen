/**
 * Shape Element Model
 */

import type { BaseElement, BoxProps, ShapeStyle, LineStyle, FillStyle, FontStyle, ElementAttribute, Anchor, PathDefinition, TextBlock, DataAttribute } from './types';

/** Shape element */
export interface ShapeElement extends BaseElement {
  type: 'shape';
  title: string;
  link?: string;  // Hyperlink URL

  // Geometry
  props: BoxProps;

  // Styles
  shapeStyle: ShapeStyle;
  lineStyle: LineStyle;
  fillStyle: FillStyle;
  fontStyle: FontStyle;

  // Content
  textBlock: TextBlock[];

  // Connection
  anchors: Anchor[];

  // Path
  path: PathDefinition[];

  // Attributes
  attribute: ElementAttribute;

  // Custom data
  dataAttributes: DataAttribute[];
  data: Record<string, unknown>;

  // Theme
  theme?: string;
}

/** Create default shape element */
export function createDefaultShape(
  id: string,
  name: string,
  options: Partial<ShapeElement> = {}
): ShapeElement {
  return {
    id,
    name,
    type: 'shape',
    title: '',
    zIndex: 0,
    locked: false,
    visible: true,
    group: null,
    parent: null,
    children: [],
    props: {
      x: 0,
      y: 0,
      w: 120,
      h: 80,
      angle: 0
    },
    shapeStyle: {
      alpha: 1
    },
    lineStyle: {
      lineWidth: 2,
      lineColor: '50,50,50',
      lineStyle: 'solid'
    },
    fillStyle: {
      type: 'solid',
      color: '255,255,255'
    },
    fontStyle: {
      fontFamily: '微软雅黑, Arial, sans-serif',
      size: 13,
      lineHeight: 1.25,
      color: '50,50,50',
      bold: false,
      italic: false,
      underline: false,
      textAlign: 'center',
      vAlign: 'middle',
      orientation: 'horizontal'
    },
    textBlock: [{
      position: { x: 10, y: 0, w: 'w-20', h: 'h' },
      text: ''
    }],
    anchors: [
      { x: 'w/2', y: '0' },
      { x: 'w/2', y: 'h' },
      { x: '0', y: 'h/2' },
      { x: 'w', y: 'h/2' }
    ],
    path: [{
      actions: [
        { action: 'move', x: '0', y: '0' },
        { action: 'line', x: 'w', y: '0' },
        { action: 'line', x: 'w', y: 'h' },
        { action: 'line', x: '0', y: 'h' },
        { action: 'close' }
      ]
    }],
    attribute: {
      container: false,
      visible: true,
      rotatable: true,
      linkable: true,
      collapsable: false,
      collapsed: false,
      markerOffset: 5,
      resizable: true,
      movable: true
    },
    dataAttributes: [],
    data: {},
    ...options
  };
}

/** Check if shape is container */
export function isContainerShape(shape: ShapeElement): boolean {
  return shape.attribute.container;
}

/** Check if shape can be resized */
export function isResizable(shape: ShapeElement): boolean {
  return shape.attribute.resizable && !shape.locked;
}

/** Check if shape can be moved */
export function isMovable(shape: ShapeElement): boolean {
  return shape.attribute.movable && !shape.locked;
}

/** Check if shape can be rotated */
export function isRotatable(shape: ShapeElement): boolean {
  return shape.attribute.rotatable && !shape.locked;
}

/** Check if shape can have connections */
export function isLinkable(shape: ShapeElement): boolean {
  return shape.attribute.linkable && !shape.locked;
}

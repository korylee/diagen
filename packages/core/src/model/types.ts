/**
 * Core Model Types for VectorGraph Editor
 * Based on ProcessOn data model design
 */

import type {
  ElementType,
  ShapeCategory,
  LinkerType,
  ArrowStyle,
  LineStyleType,
  FillType,
  GradientType,
  TextAlign,
  VerticalAlign,
  TextOrientation
} from '@vectorgraph/shared';

// ============================================================================
// Base Types
// ============================================================================

/** Base properties for all elements */
export interface BaseElement {
  id: string;
  name: string;
  type: ElementType;
  category?: ShapeCategory;
  zIndex: number;
  locked: boolean;
  visible: boolean;
  group: string | null;  // Group ID
  parent: string | null;  // Parent element ID
  children: string[];     // Child element IDs
}

/** Box properties for positioned elements */
export interface BoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;  // Rotation angle in degrees
}

// ============================================================================
// Style Types
// ============================================================================

/** Shape style (opacity, effects) */
export interface ShapeStyle {
  alpha: number;
  shadow?: ShadowStyle;
  blur?: number;
}

/** Shadow style */
export interface ShadowStyle {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

/** Line style */
export interface LineStyle {
  lineWidth: number;
  lineColor: string;
  lineStyle: LineStyleType;
  beginArrowStyle?: ArrowStyle;
  endArrowStyle?: ArrowStyle;
  lineJumpEnabled?: boolean;
}

/** Fill style */
export interface FillStyle {
  type: FillType;
  color?: string;
  beginColor?: string;
  endColor?: string;
  gradientType?: GradientType;
  angle?: number;
  radius?: number;
  /** For image fill */
  fileId?: string;
  imageUrl?: string;
  display?: 'fill' | 'fit' | 'stretch' | 'tile';
  imageX?: number;
  imageY?: number;
  imageW?: number;
  imageH?: number;
}

/** Font style */
export interface FontStyle {
  fontFamily: string;
  size: number;
  lineHeight: number;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  textAlign: TextAlign;
  vAlign: VerticalAlign;
  orientation: TextOrientation;
}

/** Text block for multi-text elements */
export interface TextBlock {
  position: RelativeRect;
  text: string;
  fontStyle?: FontStyle;
}

/** Relative rectangle (supports expressions) */
export interface RelativeRect {
  x: number | string;
  y: number | string;
  w: number | string;
  h: number | string;
}

// ============================================================================
// Element Attribute Types
// ============================================================================

/** Element attributes */
export interface ElementAttribute {
  container: boolean;
  visible: boolean;
  rotatable: boolean;
  linkable: boolean;
  collapsable: boolean;
  collapsed: boolean;
  markerOffset: number;
  resizable: boolean;
  movable: boolean;
}

/** Default element attribute values */
export const DEFAULT_ELEMENT_ATTRIBUTE: ElementAttribute = {
  container: false,
  visible: true,
  rotatable: true,
  linkable: true,
  collapsable: false,
  collapsed: false,
  markerOffset: 5,
  resizable: true,
  movable: true
};

// ============================================================================
// Anchor Types
// ============================================================================

/** Connection anchor point */
export interface Anchor {
  x: number | string;
  y: number | string;
  id?: string;
  direction?: 'top' | 'right' | 'bottom' | 'left';
}

// ============================================================================
// Path Types
// ============================================================================

/** Path action types */
export type PathActionType = 'move' | 'line' | 'curve' | 'quadraticCurve' | 'rect' | 'close';

/** Path action */
export interface PathAction {
  action: PathActionType;
  x?: number | string;
  y?: number | string;
  w?: number | string;
  h?: number | string;
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
}

/** Path definition */
export interface PathDefinition {
  fillStyle?: FillStyle;
  lineStyle?: LineStyle;
  actions: PathAction[];
}

// ============================================================================
// Data Attribute Types
// ============================================================================

/** Custom data attribute */
export interface DataAttribute {
  id: string;
  name: string;
  category: 'default' | 'custom';
  value?: string;
  visible?: boolean;
}

// ============================================================================
// Theme Types
// ============================================================================

/** Theme definition */
export interface Theme {
  name: string;
  fillStyle?: FillStyle;
  lineStyle?: LineStyle;
  fontStyle?: FontStyle;
  row?: FillStyle[];
  column?: FillStyle[];
}

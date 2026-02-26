import type { ShapeElement, LineStyle, FillStyle, FontStyle, PathDefinition, Anchor, TextBlock, ElementAttribute } from '../model';

export interface ShapeDefinition {
  id: string;
  name: string;
  title: string;
  category: string;
  group?: string;
  icon?: string;
  props: {
    w: number;
    h: number;
  };
  path: PathDefinition[];
  anchors: Anchor[];
  textBlock: TextBlock[];
  lineStyle?: Partial<LineStyle>;
  fillStyle?: Partial<FillStyle>;
  fontStyle?: Partial<FontStyle>;
  attribute?: Partial<ElementAttribute>;
}

export interface CategoryDefinition {
  id: string;
  name: string;
  icon?: string;
  order: number;
  shapes: string[];
}

export interface ThemeDefinition {
  id: string;
  name: string;
  lineStyle: Partial<LineStyle>;
  fillStyle: Partial<FillStyle>;
  fontStyle: Partial<FontStyle>;
}

export interface SchemaConfig {
  shapes: Record<string, ShapeDefinition>;
  categories: Record<string, CategoryDefinition>;
  themes: Record<string, ThemeDefinition>;
  defaultLineStyle: LineStyle;
  defaultFillStyle: FillStyle;
  defaultFontStyle: FontStyle;
}

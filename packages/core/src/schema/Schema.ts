import { generateId } from '@diagen/shared';
import type { ShapeElement } from '../model';
import { createDefaultShape } from '../model/shape';
import type { ShapeDefinition, CategoryDefinition, ThemeDefinition, SchemaConfig } from './types';
import {
  DEFAULT_LINE_STYLE,
  DEFAULT_FILL_STYLE,
  DEFAULT_FONT_STYLE,
  DEFAULT_ATTRIBUTE,
  DEFAULT_ANCHORS,
  DEFAULT_TEXT_BLOCK,
  RECTANGLE_PATH,
  ROUNDED_RECTANGLE_PATH,
  CIRCLE_PATH,
  DIAMOND_PATH,
  PARALLELOGRAM_PATH,
  ELLIPSE_PATH,
} from './defaults';

class SchemaRegistry {
  private shapes: Map<string, ShapeDefinition> = new Map();
  private categories: Map<string, CategoryDefinition> = new Map();
  private themes: Map<string, ThemeDefinition> = new Map();
  private defaultLineStyle: typeof DEFAULT_LINE_STYLE = DEFAULT_LINE_STYLE;
  private defaultFillStyle: typeof DEFAULT_FILL_STYLE = DEFAULT_FILL_STYLE;
  private defaultFontStyle: typeof DEFAULT_FONT_STYLE = DEFAULT_FONT_STYLE;

  constructor() {
    this.registerBuiltInShapes();
    this.registerBuiltInCategories();
  }

  registerShape(definition: ShapeDefinition): void {
    this.shapes.set(definition.id, definition);
  }

  registerShapes(definitions: ShapeDefinition[]): void {
    for (const def of definitions) {
      this.registerShape(def);
    }
  }

  getShape(id: string): ShapeDefinition | undefined {
    return this.shapes.get(id);
  }

  getAllShapes(): ShapeDefinition[] {
    return Array.from(this.shapes.values());
  }

  registerCategory(category: CategoryDefinition): void {
    this.categories.set(category.id, category);
  }

  getCategory(id: string): CategoryDefinition | undefined {
    return this.categories.get(id);
  }

  getAllCategories(): CategoryDefinition[] {
    return Array.from(this.categories.values()).sort((a, b) => a.order - b.order);
  }

  getShapesByCategory(categoryId: string): ShapeDefinition[] {
    const category = this.categories.get(categoryId);
    if (!category) return [];
    return category.shapes.map(id => this.shapes.get(id)).filter(Boolean) as ShapeDefinition[];
  }

  registerTheme(theme: ThemeDefinition): void {
    this.themes.set(theme.id, theme);
  }

  getTheme(id: string): ThemeDefinition | undefined {
    return this.themes.get(id);
  }

  createShape(shapeId: string, overrides: Partial<ShapeElement> = {}): ShapeElement | null {
    const definition = this.shapes.get(shapeId);
    if (!definition) return null;

    const id = generateId('shape');
    const shape: ShapeElement = {
      ...createDefaultShape(id, definition.name),
      title: definition.title,
      props: {
        x: 0,
        y: 0,
        w: definition.props.w,
        h: definition.props.h,
        angle: 0,
      },
      path: definition.path,
      anchors: definition.anchors.length > 0 ? definition.anchors : DEFAULT_ANCHORS,
      textBlock: definition.textBlock.length > 0 ? definition.textBlock : [DEFAULT_TEXT_BLOCK],
      lineStyle: { ...this.defaultLineStyle, ...definition.lineStyle },
      fillStyle: { ...this.defaultFillStyle, ...definition.fillStyle },
      fontStyle: { ...this.defaultFontStyle, ...definition.fontStyle },
      attribute: { ...DEFAULT_ATTRIBUTE, ...definition.attribute },
      ...overrides,
    };

    return shape;
  }

  setDefaultLineStyle(style: Partial<typeof DEFAULT_LINE_STYLE>): void {
    this.defaultLineStyle = { ...this.defaultLineStyle, ...style };
  }

  setDefaultFillStyle(style: Partial<typeof DEFAULT_FILL_STYLE>): void {
    this.defaultFillStyle = { ...this.defaultFillStyle, ...style };
  }

  setDefaultFontStyle(style: Partial<typeof DEFAULT_FONT_STYLE>): void {
    this.defaultFontStyle = { ...this.defaultFontStyle, ...style };
  }

  getConfig(): SchemaConfig {
    return {
      shapes: Object.fromEntries(this.shapes),
      categories: Object.fromEntries(this.categories),
      themes: Object.fromEntries(this.themes),
      defaultLineStyle: this.defaultLineStyle,
      defaultFillStyle: this.defaultFillStyle,
      defaultFontStyle: this.defaultFontStyle,
    };
  }

  private registerBuiltInShapes(): void {
    this.registerShapes([
      {
        id: 'rectangle',
        name: 'Rectangle',
        title: '矩形',
        category: 'basic',
        props: { w: 120, h: 80 },
        path: RECTANGLE_PATH,
        anchors: DEFAULT_ANCHORS,
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '' }],
      },
      {
        id: 'roundedRectangle',
        name: 'RoundedRectangle',
        title: '圆角矩形',
        category: 'basic',
        props: { w: 120, h: 80 },
        path: ROUNDED_RECTANGLE_PATH,
        anchors: DEFAULT_ANCHORS,
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '' }],
      },
      {
        id: 'circle',
        name: 'Circle',
        title: '圆形',
        category: 'basic',
        props: { w: 100, h: 100 },
        path: CIRCLE_PATH,
        anchors: DEFAULT_ANCHORS,
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '' }],
      },
      {
        id: 'diamond',
        name: 'Diamond',
        title: '菱形',
        category: 'basic',
        props: { w: 100, h: 100 },
        path: DIAMOND_PATH,
        anchors: DEFAULT_ANCHORS,
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '' }],
      },
      {
        id: 'parallelogram',
        name: 'Parallelogram',
        title: '平行四边形',
        category: 'basic',
        props: { w: 120, h: 80 },
        path: PARALLELOGRAM_PATH,
        anchors: DEFAULT_ANCHORS,
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '' }],
      },
      {
        id: 'ellipse',
        name: 'Ellipse',
        title: '椭圆',
        category: 'basic',
        props: { w: 140, h: 80 },
        path: ELLIPSE_PATH,
        anchors: DEFAULT_ANCHORS,
        textBlock: [{ position: { x: 10, y: 0, w: 'w-20', h: 'h' }, text: '' }],
      },
    ]);
  }

  private registerBuiltInCategories(): void {
    this.registerCategory({
      id: 'basic',
      name: '基础图形',
      order: 0,
      shapes: ['rectangle', 'roundedRectangle', 'circle', 'diamond', 'parallelogram', 'ellipse'],
    });
  }
}

export const Schema = new SchemaRegistry();

export { SchemaRegistry };

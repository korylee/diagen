import {
  BoxProps,
  createLinker as _createLinker,
  createShape as _createShape,
  LinkerElement,
  LinkerEndpoint,
  PathDefinition,
  ShapeElement,
} from '../model'
import type { CategoryDefinition, LinkerDefinition, SchemaConfig, ShapeDefinition, ThemeDefinition } from './types'
import {
  DEFAULT_ANCHORS,
  DEFAULT_ATTRIBUTE,
  DEFAULT_FILL_STYLE,
  DEFAULT_FONT_STYLE,
  DEFAULT_LINE_STYLE,
  DEFAULT_TEXT_BLOCK,
} from './defaults'
import { BASIC_SHAPE_CATEGORY, BASIC_SHAPES } from './basic'

export function createSchemaRegistry() {
  const shapes = new Map<string, ShapeDefinition>()
  const linkers = new Map<string, LinkerDefinition>()
  const categories = new Map<string, CategoryDefinition>()
  const themes = new Map<string, ThemeDefinition>()
  const markers = new Map<string, PathDefinition[]>()
  const globalCommands = new Map<string, any[]>()
  let defaultLineStyle: typeof DEFAULT_LINE_STYLE = { ...DEFAULT_LINE_STYLE }
  let defaultFillStyle: typeof DEFAULT_FILL_STYLE = { ...DEFAULT_FILL_STYLE }
  let defaultFontStyle: typeof DEFAULT_FONT_STYLE = { ...DEFAULT_FONT_STYLE }

  const registerShape = (definition: ShapeDefinition) => {
    shapes.set(definition.id, definition)
  }

  const registerShapes = (definitions: ShapeDefinition[]) => {
    for (const def of definitions) {
      registerShape(def)
    }
  }

  const registerLinker = (definition: LinkerDefinition) => {
    linkers.set(definition.id, definition)
  }

  const registerLinkers = (definitions: LinkerDefinition[]) => {
    for (const def of definitions) {
      registerLinker(def)
    }
  }

  const addGlobalCommand = (name: string, actions: any[]) => {
    globalCommands.set(name, actions)
  }

  const getGlobalCommand = (name: string) => globalCommands.get(name)

  const addMarker = (name: string, definition: PathDefinition[]) => {
    markers.set(name, definition)
  }

  const getMarker = (name: string) => markers.get(name)

  const getShape = (id: string) => shapes.get(id)

  const getLinker = (id: string) => linkers.get(id)

  const getAllShapes = () => Array.from(shapes.values())

  const getAllLinkers = () => Array.from(linkers.values())

  const registerCategory = (category: CategoryDefinition) => {
    categories.set(category.id, category)
  }

  const getCategory = (id: string) => categories.get(id)

  const getAllCategories = () => Array.from(categories.values()).sort((a, b) => a.order - b.order)

  const getShapesByCategory = (categoryId: string) => {
    const category = categories.get(categoryId)
    if (!category) return []
    return category.shapes.map(id => shapes.get(id)).filter(Boolean) as ShapeDefinition[]
  }

  const registerTheme = (theme: ThemeDefinition) => {
    themes.set(theme.id, theme)
  }

  const getTheme = (id: string) => themes.get(id)

  const createShape = (
    shapeId: string,
    props: Partial<BoxProps>,
    overrides: Partial<ShapeElement> = {},
  ): ShapeElement | null => {
    const definition = shapes.get(shapeId)
    if (!definition) return null

    return _createShape({
      name: definition.name,
      title: definition.title,
      category: definition.category as any,
      props: {
        x: props.x ?? 0,
        y: props.y ?? 0,
        w: props.w ?? definition.props.w,
        h: props.h ?? definition.props.h,
        angle: props.angle ?? 0,
      },
      path: definition.path,
      anchors: definition.anchors && definition.anchors.length > 0 ? definition.anchors : DEFAULT_ANCHORS,
      textBlock: definition.textBlock && definition.textBlock.length > 0 ? definition.textBlock : [DEFAULT_TEXT_BLOCK],
      lineStyle: { ...defaultLineStyle, ...definition.lineStyle },
      fillStyle: { ...defaultFillStyle, ...definition.fillStyle },
      fontStyle: { ...defaultFontStyle, ...definition.fontStyle },
      attribute: { ...DEFAULT_ATTRIBUTE, ...definition.attribute },
      ...overrides,
    })
  }

  const createLinker = (
    linkerId: string,
    from: LinkerEndpoint,
    to: LinkerEndpoint,
    overrides: Partial<LinkerElement> = {},
  ): LinkerElement | null => {
    const definition = linkers.get(linkerId)
    if (!definition) return null

    return _createLinker({
      name: definition.name,
      linkerType: definition.linkerType,
      from: { id: null, ...from },
      to: { id: null, ...to },
      lineStyle: { ...defaultLineStyle, ...definition.lineStyle },
      fontStyle: { ...defaultFontStyle, ...definition.fontStyle },
      ...overrides,
    })
  }

  const setDefaultLineStyle = (style: Partial<typeof DEFAULT_LINE_STYLE>) => {
    defaultLineStyle = { ...defaultLineStyle, ...style }
  }

  const setDefaultFillStyle = (style: Partial<typeof DEFAULT_FILL_STYLE>) => {
    defaultFillStyle = { ...defaultFillStyle, ...style }
  }

  const setDefaultFontStyle = (style: Partial<typeof DEFAULT_FONT_STYLE>) => {
    defaultFontStyle = { ...defaultFontStyle, ...style }
  }

  const getConfig = (): SchemaConfig => {
    return {
      shapes: Object.fromEntries(shapes),
      linkers: Object.fromEntries(linkers),
      categories: Object.fromEntries(categories),
      themes: Object.fromEntries(themes),
      defaultLineStyle,
      defaultFillStyle,
      defaultFontStyle,
    }
  }

  // Initialize with modular definitions
  registerShapes(BASIC_SHAPES)
  registerCategory(BASIC_SHAPE_CATEGORY)

  // Register default linkers
  registerLinkers([
    { id: 'linker', name: 'linker', title: '普通连线', linkerType: 'broken' },
    { id: 'curve_linker', name: 'curve_linker', title: '曲线连线', linkerType: 'curved' },
    { id: 'straight_linker', name: 'straight_linker', title: '直线连线', linkerType: 'straight' },
  ])

  return {
    registerShape,
    registerShapes,
    registerLinker,
    registerLinkers,
    addGlobalCommand,
    getGlobalCommand,
    addMarker,
    getMarker,
    getShape,
    getLinker,
    getAllShapes,
    getAllLinkers,
    registerCategory,
    getCategory,
    getAllCategories,
    getShapesByCategory,
    registerTheme,
    getTheme,
    createShape,
    createLinker,
    setDefaultLineStyle,
    setDefaultFillStyle,
    setDefaultFontStyle,
    getConfig,
  }
}

export const Schema = createSchemaRegistry()

export type SchemaRegistry = ReturnType<typeof createSchemaRegistry>

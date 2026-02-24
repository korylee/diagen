/**
 * Designer Store
 * Main state management for the editor using SolidJS createStore
 */

import { createStore, produce, SetStoreFunction, Store, unwrap } from 'solid-js/store';
import { createMemo } from 'solid-js';

import { generateId } from '@vectorgraph/shared';
import type {
  Point,
  Rect,
  Viewport,
  ToolType,
  DEFAULTS
} from '@vectorgraph/shared';

import type {
  Diagram,
  DiagramElement,
  ShapeElement,
  LinkerElement,
  PageConfig
} from '../model';

import { createEmptyDiagram } from '../model';

import { HistoryManager } from '../history';
import type { ICommand } from '../history/Command';
import { SelectionManager, type SelectionChangeEvent } from '../selection';

import { deepClone, deepMerge } from '@vectorgraph/shared';

// ============================================================================
// Store State Types
// ============================================================================

export interface EditorState {
  // Diagram data
  diagram: Diagram;

  // Viewport
  viewport: Viewport;

  // Canvas size (in screen pixels)
  canvasSize: {
    width: number;
    height: number;
  };

  // Active tool
  activeTool: ToolType;

  // UI State
  ui: {
    showGrid: boolean;
    showRulers: boolean;
    showMiniMap: boolean;
    snapToGrid: boolean;
    gridSize: number;
  };

  // Performance flags
  performance: {
    disableLineJumps: boolean;
  };
}

// ============================================================================
// Designer Store Options
// ============================================================================

export interface DesignerStoreOptions {
  id?: string;
  initialDiagram?: Partial<Diagram>;
  initialViewport?: Partial<Viewport>;
  maxHistorySize?: number;
  onSelectionChange?: (event: SelectionChangeEvent) => void;
  onHistoryChange?: (undoCount: number, redoCount: number) => void;
  onStateChange?: (state: EditorState) => void;
}

// ============================================================================
// Designer Store Implementation
// ============================================================================

/**
 * Designer Store - Main entry point for editor state management
 * Uses Class pattern with SolidJS createStore for reactivity
 */
export class DesignerStore {
  // SolidJS reactive state
  readonly state: Store<EditorState>;

  // State setter
  private setState: SetStoreFunction<EditorState>;

  // Managers
  readonly history: HistoryManager;
  readonly selection: SelectionManager;

  // Private state
  private _id: string;
  private _initialized = false;

  constructor(options: DesignerStoreOptions = {}) {
    this._id = options.id || generateId('editor');

    // Initialize state
    const initialState = this.createInitialState(options);
    const [state, setState] = createStore<EditorState>(initialState);
    this.state = state;
    this.setState = setState;

    // Initialize selection manager
    this.selection = new SelectionManager();
    if (options.onSelectionChange) {
      this.selection.subscribe(options.onSelectionChange);
    }

    // Initialize history manager
    this.history = new HistoryManager({
      maxSize: options.maxHistorySize,
      onStackChange: options.onHistoryChange
    });

    this._initialized = true;
  }

  /**
   * Create initial state
   */
  private createInitialState(options: DesignerStoreOptions): EditorState {
    const diagram = createEmptyDiagram(
      options.id || generateId('diagram'),
      options.initialDiagram
    );

    return {
      diagram,
      viewport: {
        x: 0,
        y: 0,
        zoom: 1,
        ...options.initialViewport
      },
      canvasSize: {
        width: 800,
        height: 600
      },
      activeTool: 'select',
      ui: {
        showGrid: true,
        showRulers: false,
        showMiniMap: false,
        snapToGrid: true,
        gridSize: 15
      },
      performance: {
        disableLineJumps: false
      }
    };
  }

  // ========================================================================
  // Getters - Expose state properties
  // ========================================================================

  /** Get diagram ID */
  get id(): string {
    return this._id;
  }

  /** Get all elements */
  get elements(): Record<string, DiagramElement> {
    return this.state.diagram.elements;
  }

  /** Get element by ID */
  getElementById(id: string): DiagramElement | undefined {
    return this.state.diagram.elements[id];
  }

  /** Get all element IDs in z-order */
  get orderList(): string[] {
    return this.state.diagram.orderList;
  }

  /** Get page config */
  get page(): PageConfig {
    return this.state.diagram.page;
  }

  /** Get viewport */
  get viewport(): Viewport {
    return this.state.viewport;
  }

  /** Get zoom level */
  get zoom(): number {
    return this.state.viewport.zoom;
  }

  /** Get canvas offset */
  get offset(): Point {
    return { x: this.state.viewport.x, y: this.state.viewport.y };
  }

  /** Get active tool */
  get activeTool(): ToolType {
    return this.state.activeTool;
  }

  /** Get element count */
  get elementCount(): number {
    return this.state.diagram.orderList.length;
  }

  /** Get selection */
  get selectedIds(): readonly string[] {
    return this.selection.getSelection();
  }

  // ========================================================================
  // Element Operations
  // ========================================================================

  /**
   * Add an element to the diagram
   */
  addElement(
    element: DiagramElement,
    options: { recordHistory?: boolean; select?: boolean } = {}
  ): void {
    const { recordHistory = true, select = true } = options;

    // Create add command
    const command: ICommand = {
      id: generateId('cmd_add'),
      name: `Add ${element.name || 'element'}`,

      execute: () => {
        this.setState('diagram', 'elements', element.id, element);
        this.setState('diagram', 'orderList', (list) => [...list, element.id]);
      },

      undo: () => {
        this.setState('diagram', 'elements', (els) => {
          const { [element.id]: _, ...rest } = els;
          return rest;
        });
        this.setState('diagram', 'orderList', (list) =>
          list.filter(id => id !== element.id)
        );
      }
    };

    if (recordHistory) {
      this.history.execute(command);
    } else {
      command.execute();
    }

    if (select) {
      this.selection.replace([element.id]);
    }
  }

  /**
   * Update an element's properties
   */
  updateElement(
    id: string,
    patch: Partial<DiagramElement>,
    options: { recordHistory?: boolean } = {}
  ): void {
    const { recordHistory = true } = options;

    const element = this.state.diagram.elements[id];
    if (!element) {
      console.warn(`Element ${id} not found`);
      return;
    }

    // Store previous values for undo
    const previousValues: Record<string, unknown> = {};

    const command: ICommand = {
      id: generateId('cmd_update'),
      name: 'Update element',

      execute: () => {
        // Apply patch
        this.setState('diagram', 'elements', id, (el) => {
          return deepMerge(deepClone(el), patch) as DiagramElement;
        });
      },

      undo: () => {
        // Restore previous values
        this.setState('diagram', 'elements', id, (el) => {
          return deepMerge(deepClone(el), previousValues) as DiagramElement;
        });
      }
    };

    // Store the values we're changing for undo
    for (const key in patch) {
      previousValues[key] = (element as Record<string, unknown>)[key];
    }

    if (recordHistory) {
      this.history.execute(command);
    } else {
      command.execute();
    }
  }

  /**
   * Remove elements
   */
  removeElements(
    ids: string[],
    options: { recordHistory?: boolean } = {}
  ): void {
    const { recordHistory = true } = options;

    if (ids.length === 0) return;

    // Store removed elements for undo
    const removedElements: Record<string, DiagramElement> = {};
    const removedOrder: string[] = [];

    for (const id of ids) {
      const element = this.state.diagram.elements[id];
      if (element) {
        removedElements[id] = deepClone(element);
        removedOrder.push(id);
      }
    }

    const command: ICommand = {
      id: generateId('cmd_remove'),
      name: `Remove ${ids.length} element(s)`,

      execute: () => {
        // Remove elements
        this.setState('diagram', 'elements', (els) => {
          const newEls = { ...els };
          for (const id of ids) {
            delete newEls[id];
          }
          return newEls;
        });

        // Remove from order list
        this.setState('diagram', 'orderList', (list) =>
          list.filter(id => !ids.includes(id))
        );

        // Clear selection
        this.selection.deselectMultiple(ids);
      },

      undo: () => {
        // Restore elements
        for (const id in removedElements) {
          this.setState('diagram', 'elements', id, removedElements[id]);
        }

        // Restore order
        this.setState('diagram', 'orderList', (list) => [
          ...list,
          ...removedOrder
        ]);
      }
    };

    if (recordHistory) {
      this.history.execute(command);
    } else {
      command.execute();
    }
  }

  /**
   * Move elements
   */
  moveElements(
    ids: string[],
    deltaX: number,
    deltaY: number,
    options: { recordHistory?: boolean } = {}
  ): void {
    const { recordHistory = true } = options;

    if (ids.length === 0 || (deltaX === 0 && deltaY === 0)) return;

    const previousPositions: Record<string, { x: number; y: number }> = {};

    for (const id of ids) {
      const element = this.state.diagram.elements[id];
      if (element && 'props' in element) {
        previousPositions[id] = {
          x: element.props.x,
          y: element.props.y
        };
      }
    }

    const command: ICommand = {
      id: generateId('cmd_move'),
      name: `Move ${ids.length} element(s)`,

      execute: () => {
        for (const id of ids) {
          this.setState('diagram', 'elements', id, 'props', (props) => ({
            ...props,
            x: props.x + deltaX,
            y: props.y + deltaY
          }));
        }
      },

      undo: () => {
        for (const id in previousPositions) {
          const pos = previousPositions[id];
          this.setState('diagram', 'elements', id, 'props', (props) => ({
            ...props,
            x: pos.x,
            y: pos.y
          }));
        }
      }
    };

    if (recordHistory) {
      this.history.execute(command);
    } else {
      command.execute();
    }
  }

  // ========================================================================
  // Selection Operations
  // ========================================================================

  /**
   * Select elements
   */
  select(ids: string | string[], clearPrevious = true): void {
    const idArray = Array.isArray(ids) ? ids : [ids];

    if (clearPrevious) {
      this.selection.replace(idArray);
    } else {
      this.selection.selectMultiple(idArray);
    }
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    this.selection.clear();
  }

  /**
   * Get selected elements
   */
  getSelectedElements(): DiagramElement[] {
    return this.selection.getSelection()
      .map(id => this.state.diagram.elements[id])
      .filter(Boolean);
  }

  // ========================================================================
  // Viewport Operations
  // ========================================================================

  /**
   * Set zoom level
   */
  setZoom(zoom: number, center?: Point): void {
    const minZoom = 0.1;
    const maxZoom = 5;
    const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom));

    if (center) {
      // Zoom toward center point
      const oldZoom = this.state.viewport.zoom;
      const scale = newZoom / oldZoom;

      this.setState('viewport', {
        zoom: newZoom,
        x: center.x - (center.x - this.state.viewport.x) * scale,
        y: center.y - (center.y - this.state.viewport.y) * scale
      });
    } else {
      this.setState('viewport', 'zoom', newZoom);
    }
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    this.setZoom(this.state.viewport.zoom + 0.1);
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    this.setZoom(this.state.viewport.zoom - 0.1);
  }

  /**
   * Zoom to fit content
   */
  zoomToFit(padding = 50): void {
    const elements = this.state.diagram.orderList
      .map(id => this.state.diagram.elements[id])
      .filter(el => el && 'props' in el) as ShapeElement[];

    if (elements.length === 0) {
      this.setZoom(1);
      return;
    }

    // Calculate bounds
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const el of elements) {
      const { x, y, w, h } = el.props;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const viewportWidth = this.state.canvasSize.width;
    const viewportHeight = this.state.canvasSize.height;

    const zoomX = (viewportWidth - padding * 2) / contentWidth;
    const zoomY = (viewportHeight - padding * 2) / contentHeight;
    const newZoom = Math.min(zoomX, zoomY, 1);

    this.setState('viewport', {
      zoom: newZoom,
      x: (viewportWidth - contentWidth * newZoom) / 2 - minX * newZoom,
      y: (viewportHeight - contentHeight * newZoom) / 2 - minY * newZoom
    });
  }

  /**
   * Pan viewport
   */
  pan(deltaX: number, deltaY: number): void {
    this.setState('viewport', {
      x: this.state.viewport.x + deltaX,
      y: this.state.viewport.y + deltaY
    });
  }

  /**
   * Set canvas size
   */
  setCanvasSize(width: number, height: number): void {
    this.setState('canvasSize', { width, height });
  }

  // ========================================================================
  // Tool Operations
  // ========================================================================

  /**
   * Set active tool
   */
  setTool(tool: ToolType): void {
    this.setState('activeTool', tool);
  }

  // ========================================================================
  // UI Operations
  // ========================================================================

  /**
   * Toggle grid visibility
   */
  toggleGrid(): void {
    this.setState('ui', 'showGrid', !this.state.ui.showGrid);
  }

  /**
   * Toggle snap to grid
   */
  toggleSnapToGrid(): void {
    this.setState('ui', 'snapToGrid', !this.state.ui.snapToGrid);
  }

  /**
   * Set grid size
   */
  setGridSize(size: number): void {
    this.setState('ui', 'gridSize', size);
  }

  // ========================================================================
  // Undo/Redo Operations
  // ========================================================================

  /**
   * Undo last action
   */
  undo(): boolean {
    return this.history.undo();
  }

  /**
   * Redo last undone action
   */
  redo(): boolean {
    return this.history.redo();
  }

  /**
   * Check if can undo
   */
  canUndo(): boolean {
    return this.history.canUndo();
  }

  /**
   * Check if can redo
   */
  canRedo(): boolean {
    return this.history.canRedo();
  }

  // ========================================================================
  // Batch Operations (for dragging, etc.)
  // ========================================================================

  /**
   * Begin batch operation (for dragging)
   */
  beginBatch(): void {
    this.history.beginBatch();
  }

  /**
   * Commit batch operation
   */
  commitBatch(name?: string): void {
    this.history.commitBatch();
  }

  /**
   * Cancel batch operation
   */
  cancelBatch(): void {
    this.history.cancelBatch();
  }

  // ========================================================================
  // Serialization
  // ========================================================================

  /**
   * Serialize diagram to JSON
   */
  serialize(): string {
    return JSON.stringify(this.state.diagram, null, 2);
  }

  /**
   * Load diagram from JSON
   */
  loadFromJSON(json: string, options: { recordHistory?: boolean } = {}): void {
    const { recordHistory = false } = options;

    const diagram = JSON.parse(json) as Diagram;

    const command: ICommand = {
      id: generateId('cmd_load'),
      name: 'Load diagram',

      execute: () => {
        this.setState('diagram', diagram);
      },

      undo: () => {
        // Just clear - can't really undo a full load
        this.setState('diagram', 'elements', {});
        this.setState('diagram', 'orderList', []);
      }
    };

    if (recordHistory) {
      this.history.execute(command);
    } else {
      command.execute();
    }

    this.selection.clear();
  }

  /**
   * Clear diagram
   */
  clear(options: { recordHistory?: boolean } = {}): void {
    const { recordHistory = true } = options;

    const elements = deepClone(this.state.diagram.elements);
    const orderList = [...this.state.diagram.orderList];

    const command: ICommand = {
      id: generateId('cmd_clear'),
      name: 'Clear diagram',

      execute: () => {
        this.setState('diagram', 'elements', {});
        this.setState('diagram', 'orderList', []);
        this.selection.clear();
      },

      undo: () => {
        this.setState('diagram', 'elements', elements);
        this.setState('diagram', 'orderList', orderList);
      }
    };

    if (recordHistory) {
      this.history.execute(command);
    } else {
      command.execute();
    }
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  /**
   * Get element bounds
   */
  getElementBounds(id: string): Rect | null {
    const element = this.state.diagram.elements[id];
    if (!element) return null;

    if ('props' in element) {
      const props = element.props;
      return {
        x: props.x,
        y: props.y,
        w: props.w,
        h: props.h
      };
    }

    // For linkers, calculate from points
    if ('from' in element && 'to' in element) {
      const from = element.from;
      const to = element.to;

      const minX = Math.min(from.x, to.x);
      const minY = Math.min(from.y, to.y);
      const maxX = Math.max(from.x, to.x);
      const maxY = Math.max(from.y, to.y);

      return {
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY
      };
    }

    return null;
  }

  /**
   * Get bounding box of selected elements
   */
  getSelectionBounds(): Rect | null {
    const selectedIds = this.selection.getSelection();
    if (selectedIds.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const id of selectedIds) {
      const bounds = this.getElementBounds(id);
      if (bounds) {
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.w);
        maxY = Math.max(maxY, bounds.y + bounds.h);
      }
    }

    if (minX === Infinity) return null;

    return {
      x: minX,
      y: minY,
      w: maxX - minX,
      h: maxY - minY
    };
  }

  /**
   * Dispose the store
   */
  dispose(): void {
    // Clear history
    this.history.clear();

    // Clear selection
    this.selection.clear();
  }
}

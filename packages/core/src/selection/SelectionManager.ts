/**
 * Selection Manager
 * Manages element selection state
 */

import type { Store } from 'solid-js/store';
import type { Rect } from '@vectorgraph/shared';
import { getRectCenter, unionRect, normalizeRect } from '@vectorgraph/shared';

export interface SelectionState {
  selectedIds: string[];
  anchorPoint: { x: number; y: number } | null;
}

export interface SelectionChangeEvent {
  type: 'select' | 'deselect' | 'clear' | 'replace';
  ids: string[];
  previousIds: string[];
}

/**
 * Callback type for selection changes
 */
export type SelectionChangeCallback = (event: SelectionChangeEvent) => void;

/**
 * Selection Manager handles element selection state
 */
export class SelectionManager {
  private state: Store<SelectionState>;
  private callbacks: Set<SelectionChangeCallback> = new Set();

  constructor() {
    this.state = {
      selectedIds: [],
      anchorPoint: null
    } as Store<SelectionState>;
  }

  /**
   * Get current selection (returns readonly array)
   */
  getSelection(): readonly string[] {
    return this.state.selectedIds;
  }

  /**
   * Get selection count
   */
  getSelectionCount(): number {
    return this.state.selectedIds.length;
  }

  /**
   * Check if an element is selected
   */
  isSelected(id: string): boolean {
    return this.state.selectedIds.includes(id);
  }

  /**
   * Check if selection is empty
   */
  isEmpty(): boolean {
    return this.state.selectedIds.length === 0;
  }

  /**
   * Check if multiple elements are selected
   */
  hasMultiple(): boolean {
    return this.state.selectedIds.length > 1;
  }

  /**
   * Replace selection with new IDs
   */
  replace(ids: string[], anchorPoint?: { x: number; y: number }): void {
    const previousIds = [...this.state.selectedIds];

    // Filter out duplicates and maintain order
    const uniqueIds = [...new Set(ids)];

    this.state.selectedIds = uniqueIds;
    this.state.anchorPoint = anchorPoint || null;

    this.notifyChange({
      type: 'replace',
      ids: uniqueIds,
      previousIds
    });
  }

  /**
   * Add to selection (toggle mode)
   */
  toggle(id: string, anchorPoint?: { x: number; y: number }): void {
    const previousIds = [...this.state.selectedIds];
    const index = this.state.selectedIds.indexOf(id);

    if (index >= 0) {
      // Deselect
      this.state.selectedIds.splice(index, 1);
    } else {
      // Select
      this.state.selectedIds.push(id);
      this.state.anchorPoint = anchorPoint || null;
    }

    this.notifyChange({
      type: 'select',
      ids: this.state.selectedIds,
      previousIds
    });
  }

  /**
   * Add to selection
   */
  select(id: string, anchorPoint?: { x: number; y: number }): void {
    if (this.isSelected(id)) {
      return;
    }

    const previousIds = [...this.state.selectedIds];
    this.state.selectedIds.push(id);
    this.state.anchorPoint = anchorPoint || null;

    this.notifyChange({
      type: 'select',
      ids: [id],
      previousIds
    });
  }

  /**
   * Add multiple IDs to selection
   */
  selectMultiple(ids: string[], anchorPoint?: { x: number; y: number }): void {
    const previousIds = [...this.state.selectedIds];
    const newIds: string[] = [];

    for (const id of ids) {
      if (!this.isSelected(id)) {
        this.state.selectedIds.push(id);
        newIds.push(id);
      }
    }

    if (newIds.length > 0) {
      this.state.anchorPoint = anchorPoint || null;

      this.notifyChange({
        type: 'select',
        ids: newIds,
        previousIds
      });
    }
  }

  /**
   * Remove from selection
   */
  deselect(id: string): void {
    const previousIds = [...this.state.selectedIds];
    const index = this.state.selectedIds.indexOf(id);

    if (index >= 0) {
      this.state.selectedIds.splice(index, 1);

      this.notifyChange({
        type: 'deselect',
        ids: [id],
        previousIds
      });
    }
  }

  /**
   * Remove multiple IDs from selection
   */
  deselectMultiple(ids: string[]): void {
    const previousIds = [...this.state.selectedIds];
    const idSet = new Set(ids);
    let changed = false;

    for (let i = this.state.selectedIds.length - 1; i >= 0; i--) {
      if (idSet.has(this.state.selectedIds[i])) {
        this.state.selectedIds.splice(i, 1);
        changed = true;
      }
    }

    if (changed) {
      this.notifyChange({
        type: 'deselect',
        ids,
        previousIds
      });
    }
  }

  /**
   * Clear all selection
   */
  clear(): void {
    if (this.isEmpty()) {
      return;
    }

    const previousIds = [...this.state.selectedIds];
    this.state.selectedIds = [];
    this.state.anchorPoint = null;

    this.notifyChange({
      type: 'clear',
      ids: [],
      previousIds
    });
  }

  /**
   * Get anchor point (point where selection started)
   */
  getAnchorPoint(): { x: number; y: number } | null {
    return this.state.anchorPoint;
  }

  /**
   * Subscribe to selection changes
   */
  subscribe(callback: SelectionChangeCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Notify all subscribers of change
   */
  private notifyChange(event: SelectionChangeEvent): void {
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in selection change callback:', error);
      }
    }
  }

  /**
   * Calculate bounding box of selected elements
   */
  static calculateBounds(
    getElementBounds: (id: string) => Rect | null
  ): Rect | null {
    const bounds: Rect[] = [];

    for (const id of this.state.selectedIds) {
      const elementBounds = getElementBounds(id);
      if (elementBounds) {
        bounds.push(normalizeRect(elementBounds));
      }
    }

    if (bounds.length === 0) {
      return null;
    }

    if (bounds.length === 1) {
      return bounds[0];
    }

    // Union all bounds
    let result = bounds[0];
    for (let i = 1; i < bounds.length; i++) {
      result = unionRect(result, bounds[i]);
    }

    return result;
  }
}

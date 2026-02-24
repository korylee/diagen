/**
 * Page Model
 */

export interface PageConfig {
  id: string;
  name: string;
  backgroundColor: string;
  width: number;
  height: number;
  padding: number;
  showGrid: boolean;
  gridSize: number;
  gridColor?: string;
  gridStyle?: 'dot' | 'line' | 'cross';
  orientation: 'portrait' | 'landscape';
  lineJumps: boolean;
}

/** Create default page config */
export function createDefaultPage(
  id: string,
  options: Partial<PageConfig> = {}
): PageConfig {
  return {
    id,
    name: 'Page 1',
    backgroundColor: 'transparent',
    width: 1050,
    height: 1000,
    padding: 20,
    showGrid: true,
    gridSize: 15,
    gridColor: '#e0e0e0',
    gridStyle: 'line',
    orientation: 'portrait',
    lineJumps: false,
    ...options
  };
}

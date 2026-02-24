/**
 * UUID Generator for VectorGraph Editor
 * Generates unique IDs for elements
 */

let _counter = 0;
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a unique ID with optional prefix
 * Format: {prefix}_{random chars}_{counter}
 * @param prefix - Optional prefix for the ID (e.g., 'shape', 'linker')
 * @returns Unique ID string
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = _generateRandomString(6);
  const counterPart = (_counter++).toString(36);

  const parts = [timestamp.slice(-4), randomPart, counterPart];
  if (prefix) {
    parts.unshift(prefix);
  }

  return parts.join('_');
}

/**
 * Generates a random string of specified length
 */
function _generateRandomString(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

/**
 * Generates a short ID (useful for temp IDs during creation)
 */
export function generateShortId(): string {
  return _generateRandomString(8);
}

/**
 * Generates UUID v4 compatible string
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Resets the counter (mainly for testing)
 */
export function resetIdCounter(): void {
  _counter = 0;
}

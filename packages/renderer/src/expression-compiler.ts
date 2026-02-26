export type CompiledExpression = (w: number, h: number) => number;

const expressionCache = new Map<string, CompiledExpression>();

const VALID_EXPRESSION_REGEX = /^[\w\d\s\+\-\*\/\(\)\.]+$/;

export function compileExpression(expr: string): CompiledExpression | null {
  if (expressionCache.has(expr)) {
    return expressionCache.get(expr)!;
  }

  if (!VALID_EXPRESSION_REGEX.test(expr)) {
    console.warn(`Invalid expression: ${expr}`);
    return null;
  }

  try {
    const fn = new Function('w', 'h', `return (${expr})`) as CompiledExpression;
    
    const testResult = fn(100, 100);
    if (typeof testResult !== 'number' || isNaN(testResult)) {
      console.warn(`Expression did not return a valid number: ${expr}`);
      return null;
    }
    
    expressionCache.set(expr, fn);
    return fn;
  } catch (e) {
    console.warn(`Failed to compile expression: ${expr}`, e);
    return null;
  }
}

export function evaluateCompiled(
  compiled: CompiledExpression | null | undefined,
  w: number,
  h: number,
  defaultValue: number = 0
): number {
  if (!compiled) return defaultValue;
  
  try {
    const result = compiled(w, h);
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      return defaultValue;
    }
    return result;
  } catch (e) {
    console.warn('Expression evaluation failed:', e);
    return defaultValue;
  }
}

export function evaluateExpression(
  expr: number | string,
  w: number,
  h: number,
  defaultValue: number = 0
): number {
  if (typeof expr === 'number') return expr;
  
  const compiled = compileExpression(expr);
  return evaluateCompiled(compiled, w, h, defaultValue);
}

export function clearExpressionCache(): void {
  expressionCache.clear();
}

export function getCacheSize(): number {
  return expressionCache.size;
}

export interface CompiledValue {
  type: 'number' | 'expression';
  value: number;
  compiled?: CompiledExpression;
}

export function compileValue(val: number | string): CompiledValue {
  if (typeof val === 'number') {
    return { type: 'number', value: val };
  }
  
  const compiled = compileExpression(val)!;
  return {
    type: 'expression',
    value: 0,
    compiled
  };
}

export function evaluateCompiledValue(
  compiled: CompiledValue,
  w: number,
  h: number
): number {
  if (compiled.type === 'number') {
    return compiled.value;
  }
  return evaluateCompiled(compiled.compiled, w, h, 0);
}

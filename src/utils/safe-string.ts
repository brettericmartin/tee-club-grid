/**
 * Safe string conversion utilities to avoid Symbol conversion errors
 */

export function safeString(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  if (typeof value === 'string') {
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (typeof value === 'object') {
    // Check for Symbol properties
    if (Object.getOwnPropertySymbols(value).length > 0) {
      console.warn('Object contains Symbol properties, using safe conversion');
      return JSON.stringify(value, (key, val) => {
        if (typeof val === 'symbol') {
          return val.description || '[Symbol]';
        }
        return val;
      });
    }
    
    // Regular object
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  
  return String(value);
}

export function safeJoin(arr: any[], separator = ', '): string {
  return arr.map(item => safeString(item)).join(separator);
}
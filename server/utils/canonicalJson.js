/**
 * Deterministic deep canonical JSON serializer.
 * Recursively sorts all object keys at every nesting depth.
 */
export function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalStringify(obj[key]);
  });
  return '{' + pairs.join(',') + '}';
}

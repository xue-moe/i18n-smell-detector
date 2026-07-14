export function flattenLocale(input: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  flattenValue(input, prefix, result);
  return result;
}

function flattenValue(input: unknown, path: string, result: Record<string, string>): void {
  if (typeof input === 'string') {
    if (!path) throw unsupportedLeaf(path, input);
    if (Object.hasOwn(result, path)) throw new Error(`Flattened locale key collision at "${path}"`);
    Object.defineProperty(result, path, {
      value: input,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    return;
  }

  if (Array.isArray(input)) {
    input.forEach((value, index) => flattenValue(value, joinPath(path, String(index)), result));
    return;
  }

  if (input && typeof input === 'object') {
    for (const [key, value] of Object.entries(input)) {
      flattenValue(value, joinPath(path, key), result);
    }
    return;
  }

  throw unsupportedLeaf(path, input);
}

function joinPath(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}

function unsupportedLeaf(path: string, value: unknown): Error {
  const type = value === null ? 'null' : typeof value;
  return new Error(`Unsupported locale value at "${path || '<root>'}": expected a string; received ${type}`);
}

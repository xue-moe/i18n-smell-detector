export function flattenLocale(input: unknown, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};

  if (typeof input === 'string') {
    if (prefix) result[prefix] = input;
    return result;
  }

  if (Array.isArray(input)) {
    input.forEach((value, index) => {
      Object.assign(result, flattenLocale(value, prefix ? `${prefix}.${index}` : String(index)));
    });
    return result;
  }

  if (!input || typeof input !== 'object') return result;

  for (const [key, value] of Object.entries(input)) {
    Object.assign(result, flattenLocale(value, prefix ? `${prefix}.${key}` : key));
  }

  return result;
}

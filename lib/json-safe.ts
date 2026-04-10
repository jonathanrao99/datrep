/**
 * Deep-clone into JSON-serializable data (e.g. BigInt from some Excel parsers).
 */
export function sanitizeForJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v))
  ) as T;
}

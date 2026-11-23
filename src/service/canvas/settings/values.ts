// Keys whose values differ between two flat settings objects.
export function changedValueKeys<T extends object>(a: T, b: T): string[] {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter(
    (key) => JSON.stringify((a as Record<string, unknown>)[key]) !== JSON.stringify((b as Record<string, unknown>)[key]),
  );
}

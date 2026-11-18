const COUNTER = Symbol.for('mood-mates.uid');

export function nextUid(): number {
  const store = globalThis as unknown as Record<symbol, number | undefined>;
  const next = (store[COUNTER] ?? 0) + 1;
  store[COUNTER] = next;
  return next;
}

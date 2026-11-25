import { useSyncExternalStore } from 'react';

export type BodyStyle = 'flat' | 'fluffy';

export const BODY_STYLES: Array<{ id: BodyStyle; name: string }> = [
  { id: 'flat', name: 'Flat' },
  { id: 'fluffy', name: 'Fluffy' },
];

const KEY = 'mascot-studio.body.v1';
const listeners = new Set<() => void>();

function read(): BodyStyle {
  try {
    return window.localStorage.getItem(KEY) === 'fluffy' ? 'fluffy' : 'flat';
  } catch {
    return 'flat';
  }
}

let current: BodyStyle = read();

export function getBodyStyle(): BodyStyle {
  return current;
}

function persist(style: BodyStyle): void {
  try {
    window.localStorage.setItem(KEY, style);
  } catch {
    return;
  }
}

export function setBodyStyle(next: BodyStyle): void {
  if (next === current) return;
  current = next;
  persist(next);
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBodyStyle(): BodyStyle {
  return useSyncExternalStore(subscribe, getBodyStyle);
}

import { useSyncExternalStore } from 'react';
import { MoodMates } from '../kits';
import { compileDesign, type Design, sanitizeDesign } from './design';

/**
 * Custom mascots live only in this browser: every design is kept in localStorage
 * and registered with the Mood Mates engine at startup, so it behaves like a built-in character.
 */

const STORE_KEY = 'mascot-studio.designs.v1';
const MAX_DESIGNS = 40;

export interface DesignState {
  designs: Design[];
  activeId: string | null;
  /** Bumped per design on every recompile so live previews can remount. */
  revisions: Record<string, number>;
}

let state: DesignState = { designs: [], activeId: null, revisions: {} };
const listeners = new Set<() => void>();

function persist(): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ designs: state.designs, activeId: state.activeId }));
  } catch {
    return;
  }
}

function emit(next: DesignState): void {
  state = next;
  persist();
  for (const fn of listeners) fn();
}

function register(design: Design): boolean {
  const result = MoodMates.characters.register(compileDesign(design));
  if (!result.ok) console.warn('[designer] could not register', design.id, result.errors);
  return result.ok;
}

function load(): void {
  let parsed: { designs?: unknown; activeId?: unknown } = {};
  try {
    parsed = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
  } catch {
    parsed = {};
  }
  const list = Array.isArray(parsed.designs) ? parsed.designs : [];
  const designs: Design[] = [];
  const revisions: Record<string, number> = {};
  for (const raw of list.slice(0, MAX_DESIGNS)) {
    const design = sanitizeDesign(raw);
    if (!design || designs.some((d) => d.id === design.id)) continue;
    try {
      if (!register(design)) continue;
    } catch (e) {
      console.warn('[designer] skipped a broken design', e);
      continue;
    }
    designs.push(design);
    revisions[design.id] = 1;
  }
  const activeId =
    typeof parsed.activeId === 'string' && designs.some((d) => d.id === parsed.activeId)
      ? parsed.activeId
      : (designs[0]?.id ?? null);
  state = { designs, activeId, revisions };
}

load();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getDesignState(): DesignState {
  return state;
}

export function useDesigns(): DesignState {
  return useSyncExternalStore(subscribe, getDesignState);
}

export function hasDesign(id: string): boolean {
  return state.designs.some((d) => d.id === id);
}

export function designCount(): number {
  return state.designs.length;
}

/** Adds or replaces a design, recompiles it and makes it the active one. */
export function saveDesign(design: Design): boolean {
  if (!register(design)) return false;
  const exists = state.designs.some((d) => d.id === design.id);
  if (!exists && state.designs.length >= MAX_DESIGNS) return false;
  const designs = exists
    ? state.designs.map((d) => (d.id === design.id ? design : d))
    : [...state.designs, design];
  emit({
    designs,
    activeId: design.id,
    revisions: { ...state.revisions, [design.id]: (state.revisions[design.id] ?? 0) + 1 },
  });
  return true;
}

export function selectDesign(id: string): void {
  if (!hasDesign(id) || state.activeId === id) return;
  emit({ ...state, activeId: id });
}

export function deleteDesign(id: string): void {
  const designs = state.designs.filter((d) => d.id !== id);
  const index = state.designs.findIndex((d) => d.id === id);
  const fallback = designs[Math.min(index, designs.length - 1)]?.id ?? null;
  const { [id]: _gone, ...revisions } = state.revisions;
  emit({ designs, activeId: state.activeId === id ? fallback : state.activeId, revisions });
}

export function designFile(design: Design): Blob {
  const { id: _id, ...portable } = design;
  return new Blob([`${JSON.stringify({ kind: 'mascot-studio.design', ...portable }, null, 2)}\n`], {
    type: 'application/json',
  });
}

/** Parses a design file. Imported designs always get a fresh id so they never overwrite one. */
export function parseDesignFile(text: string): Design | null {
  try {
    return sanitizeDesign(JSON.parse(text), false);
  } catch {
    return null;
  }
}

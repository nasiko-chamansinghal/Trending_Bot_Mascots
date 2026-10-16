import { useSyncExternalStore } from 'react';

let openId: string | null = null;
const listeners = new Set<() => void>();
const hosts = new Map<string, HTMLElement>();

function emit(): void {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDropdownOpen(id: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => openId === id,
    () => false,
  );
}

export function registerDropdownHost(id: string, el: HTMLElement | null): void {
  if (el) hosts.set(id, el);
  else hosts.delete(id);
}

export function toggleDropdown(id: string): void {
  openId = openId === id ? null : id;
  emit();
}

export function closeDropdown(id: string): void {
  if (openId === id) {
    openId = null;
    emit();
  }
}

export function closeAllDropdowns(): boolean {
  const any = openId !== null;
  if (any) {
    openId = null;
    emit();
  }
  return any;
}

function onDocumentClick(e: MouseEvent): void {
  if (openId === null) return;
  const host = hosts.get(openId);
  if (host && !host.contains(e.target as Node)) closeAllDropdowns();
}

export function installDropdownDismiss(): () => void {
  document.addEventListener('click', onDocumentClick);
  return () => document.removeEventListener('click', onDocumentClick);
}

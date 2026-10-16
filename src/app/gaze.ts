interface GazeEngine {
  setGaze(nx: number, ny: number): unknown;
  clearGaze(): unknown;
}

interface GazeTarget {
  engine: GazeEngine;
  el: HTMLElement;
  rect: DOMRect | null;
  rectAt: number;
}

let targets: GazeTarget[] = [];

export function watchGaze(engine: GazeEngine, el: HTMLElement): void {
  targets.push({ engine, el, rect: null, rectAt: 0 });
}

export function unwatchGaze(el: HTMLElement): void {
  targets = targets.filter((t) => t.el !== el);
}

export function refreshGazeRects(): void {
  for (const t of targets) t.rect = null;
}

function clamp06(v: number): number {
  return v < -0.6 ? -0.6 : v > 0.6 ? 0.6 : v;
}

function onPointerMove(e: PointerEvent): void {
  const now = performance.now();
  for (const t of targets) {
    if (!t.rect || now - t.rectAt > 200) {
      t.rect = t.el.getBoundingClientRect();
      t.rectAt = now;
    }
    const r = t.rect;
    if (!r.width || !r.height) continue;
    t.engine.setGaze(
      clamp06((e.clientX - (r.left + r.width / 2)) / r.width) / 0.6,
      clamp06((e.clientY - (r.top + r.height / 2)) / r.height) / 0.6,
    );
  }
}

function onPointerLeave(): void {
  for (const t of targets) t.engine.clearGaze();
}

export function installGazeListeners(): () => void {
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('resize', refreshGazeRects, { passive: true });
  window.addEventListener('scroll', refreshGazeRects, { passive: true });
  return () => {
    window.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('resize', refreshGazeRects);
    window.removeEventListener('scroll', refreshGazeRects);
  };
}

export const initScript = ({ key, prefs, constantRandom } = {}) => {
  let s = 123456789;
  Math.random = constantRandom
    ? () => 0.5
    : () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
  if (key) localStorage.setItem(key, JSON.stringify(prefs));

  let now = 1000;
  let nextId = 1;
  const timers = new Map();
  const frames = new Map();
  performance.now = () => now;
  Date.now = () => now;
  window.setTimeout = (fn, delay = 0, ...args) => {
    const id = nextId++;
    timers.set(id, { fn, args, due: now + Math.max(0, Number(delay) || 0), every: 0 });
    return id;
  };
  window.setInterval = (fn, delay = 0, ...args) => {
    const id = nextId++;
    const every = Math.max(1, Number(delay) || 0);
    timers.set(id, { fn, args, due: now + every, every });
    return id;
  };
  window.clearTimeout = (id) => timers.delete(id);
  window.clearInterval = (id) => timers.delete(id);
  window.requestAnimationFrame = (fn) => {
    const id = nextId++;
    frames.set(id, fn);
    return id;
  };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  const fireDue = (limit) => {
    for (;;) {
      let pick = null;
      for (const [id, t] of timers) {
        if (t.due <= limit && (!pick || t.due < pick.t.due)) pick = { id, t };
      }
      if (!pick) return;
      now = Math.max(now, pick.t.due);
      if (pick.t.every) pick.t.due += pick.t.every;
      else timers.delete(pick.id);
      pick.t.fn(...pick.t.args);
    }
  };
  window.__advance = (ms) => {
    const end = now + ms;
    while (now < end) {
      const frameAt = Math.min(now + 16, end);
      fireDue(frameAt);
      now = frameAt;
      const batch = [...frames];
      frames.clear();
      for (const [, fn] of batch) fn(now);
    }
  };
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      setTimeout(() => this.callback([{ isIntersecting: true, intersectionRatio: 1, target }], this), 0);
    }
    unobserve() {}
    disconnect() {}
  };
};

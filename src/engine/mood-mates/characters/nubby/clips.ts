import type { ClipDef, ClipFrame } from '../../types';

const TAU = Math.PI * 2;

function arc(u: number): number {
  return 4 * u * (1 - u);
}

function easeOut(u: number): number {
  return 1 - (1 - u) ** 3;
}

function clamp01(u: number): number {
  return u < 0 ? 0 : u > 1 ? 1 : u;
}

function settle(tt: number, amp: number, freq: number, damp: number): number {
  return amp * Math.exp(-damp * tt) * Math.cos(TAU * freq * tt);
}

function flight(u: number, height: number): ClipFrame {
  const stretch = 1 + 0.16 * Math.abs(2 * u - 1) ** 2.2;
  return {
    dy: -height * arc(u),
    sy: stretch,
    sx: 1 / stretch ** 0.75,
    eyeSy: 1 + 0.1 * Math.abs(2 * u - 1) ** 2,
  };
}

function squashAt(tt: number, depth: number): ClipFrame {
  const k = settle(tt, depth, 2.6, 5.2);
  return { sy: 1 - k, sx: 1 + k * 0.72, eyeSy: 1 - k * 0.5 };
}

export const hopHopPop: ClipDef = {
  duration: 2000,
  expr: [
    { at: 0, expr: 'calm2', speed: 12 },
    { at: 200, expr: 'wide', speed: 12 },
    { at: 360, expr: 'happy', speed: 12 },
    { at: 780, expr: 'wide', speed: 12 },
    { at: 1000, expr: 'happy2', speed: 12 },
    { at: 1500, expr: 'happy', speed: 9 },
  ],
  burst: [
    { at: 640, count: 7 },
    { at: 1240, count: 9 },
  ],
  sample(t, strength) {
    const h1 = 30 + 12 * strength;
    const h2 = h1 * 0.55;
    if (t < 200) {
      const u = easeOut(clamp01(t / 200));
      return { sy: 1 - 0.2 * u, sx: 1 + 0.14 * u, eyeSy: 1 - 0.2 * u };
    }
    if (t < 640) {
      const u = (t - 200) / 440;
      return { ...flight(u, h1), rotate: 5 * Math.sin(Math.PI * u) };
    }
    if (t < 780) return squashAt((t - 640) / 1000, 0.22);
    if (t < 1240) {
      const u = (t - 780) / 460;
      return { ...flight(u, h2), rotate: -4 * Math.sin(Math.PI * u) };
    }
    const tt = (t - 1240) / 1000;
    return { ...squashAt(tt, 0.14), rotate: settle(tt, 4.5, 2.1, 3.2) };
  },
};

export const happyWaddle: ClipDef = {
  duration: 1900,
  expr: [
    { at: 0, expr: 'happy', speed: 12 },
    { at: 1600, expr: 'calm', speed: 8 },
  ],
  burst: [{ at: 1500, count: 6 }],
  sample(t, strength) {
    const env = clamp01(t / 160) * clamp01((1900 - t) / 420);
    const ph = (TAU * t) / 440;
    const lift = Math.abs(Math.sin(ph / 2));
    return {
      rotate: 9 * strength * env * Math.sin(ph / 2 + 0.4),
      dx: 3.2 * env * Math.sin(ph / 2 + 0.4),
      dy: -3.5 * env * lift,
      sy: 1 - 0.05 * env * (1 - lift),
      sx: 1 + 0.035 * env * (1 - lift),
    };
  },
};

export const shyPeek: ClipDef = {
  duration: 2100,
  expr: [
    { at: 0, expr: 'shy', speed: 12 },
    { at: 760, expr: 'wide', speed: 12 },
    { at: 1100, expr: 'happy', speed: 10 },
    { at: 1700, expr: 'calm', speed: 8 },
  ],
  burst: [{ at: 800, count: 10 }],
  sample(t, strength) {
    if (t < 260) {
      const u = easeOut(clamp01(t / 260));
      return { sy: 1 - 0.3 * u, sx: 1 + 0.1 * u, eyeSy: 1 - 0.25 * u };
    }
    if (t < 760) {
      const k = (t - 260) / 500;
      return {
        sy: 0.7 + 0.01 * Math.sin(k * 18),
        sx: 1.1,
        eyeSy: 0.75,
        rotate: 1.2 * Math.sin(k * 11),
      };
    }
    if (t < 1100) {
      const u = (t - 760) / 340;
      const pop = 22 + 8 * strength;
      const stretch = 1 + 0.22 * Math.sin(Math.PI * Math.min(1, u * 1.2));
      return { dy: -pop * arc(Math.min(1, u * 1.15)), sy: stretch, sx: 1 / stretch ** 0.75 };
    }
    const tt = (t - 1100) / 1000;
    return { ...squashAt(tt, 0.16), rotate: settle(tt, 5, 1.9, 3) };
  },
};

import type { AnimSpec } from '../../types';

type Emotion = Record<string, unknown>;

interface Swing {
  type: string;
  amp: number;
  period?: number;
  phase?: number;
  speed?: number;
  decay?: number;
}

interface ArmPlan {
  rest: [number, number];
  l?: Swing;
  r?: Swing;
  keys?: Array<[number, number]>;
}

const OPPOSITE = Math.PI;

const sine = (amp: number, period: number, phase = 0): Swing => ({ type: 'sine', amp, period, phase });
const pulse = (amp: number, period: number, phase = 0): Swing => ({ type: 'pulse', amp, period, phase });
const scan = (amp: number, period: number): Swing => ({ type: 'scan', amp, period });
const jitter = (amp: number, speed: number, decay?: number): Swing => ({
  type: 'jitter',
  amp,
  speed,
  ...(decay ? { decay } : {}),
});

const PLANS: Record<string, ArmPlan> = {
  '00': { rest: [-62, -58], l: sine(2, 4200), r: sine(2, 4200, 1.4) },
  '01': {
    rest: [0, 0],
    keys: [
      [-62, -58],
      [-40, -30],
      [-30, -34],
      [46, 42],
      [0, 0],
    ],
  },
  '02': { rest: [0, 0], l: pulse(8, 5600), r: pulse(11, 5200, 1.9) },
  '03': { rest: [-6, 24], r: sine(4, 2400) },
  '04': { rest: [-22, -20], l: sine(5, 5200), r: sine(5, 5200, 2) },
  '05': { rest: [4, 4], l: sine(9, 800), r: sine(9, 800, OPPOSITE) },
  '06': { rest: [-50, -46] },
  '07': {
    rest: [0, 0],
    l: jitter(12, 9, 700),
    r: jitter(12, 9, 700),
    keys: [
      [40, 36],
      [-8, 22],
      [6, -4],
      [0, 0],
    ],
  },
  '10': { rest: [30, 28], l: sine(11, 1400), r: sine(11, 1400, OPPOSITE) },
  '11': { rest: [28, -10], l: sine(6, 2000) },
  '12': { rest: [-52, -48], l: sine(2, 3600) },
  '13': {
    rest: [26, 24],
    keys: [
      [0, 0],
      [58, 56],
      [34, 32],
    ],
  },
  '14': { rest: [-34, -34], l: sine(4, 2600), r: sine(4, 2600, 1.6) },
  '15': { rest: [-46, -42], l: sine(2, 3400), r: sine(2, 3400, 1.2) },
  '16': { rest: [-14, -14], l: jitter(1.5, 6), r: jitter(1.5, 6) },
  '17': { rest: [40, 38], l: jitter(24, 13), r: jitter(24, 13) },
  '18': { rest: [-38, -32], l: sine(5, 3000), r: sine(5, 3000, 1.3) },
  '19': { rest: [14, 14], l: sine(6, 2100), r: sine(6, 2100, OPPOSITE) },
  '20': { rest: [30, -8], l: sine(10, 620) },
  '21': {
    rest: [-34, -30],
    l: jitter(2.5, 10),
    keys: [
      [0, 0],
      [-34, -30],
    ],
  },
  '30': { rest: [-18, 52], r: sine(3, 2600) },
  '31': {
    rest: [14, 14],
    keys: [
      [0, 0],
      [-10, -10],
      [30, 30],
      [14, 14],
    ],
  },
  '32': { rest: [-6, -6], l: sine(13, 520), r: sine(13, 520, OPPOSITE) },
  '33': {
    rest: [22, 22],
    l: sine(7, 900),
    r: sine(7, 900, OPPOSITE),
    keys: [
      [0, 0],
      [58, 56],
      [38, 36],
      [22, 22],
    ],
  },
  '34': { rest: [30, 26], l: jitter(10, 12), r: jitter(10, 12) },
  '35': { rest: [36, -6], l: sine(3, 2200) },
  '36': { rest: [0, 0], l: scan(10, 1600), r: scan(-10, 1600) },
  '37': { rest: [-20, 46], r: sine(3, 3000) },
  '38': { rest: [-14, -14], l: sine(9, 470), r: sine(9, 470, OPPOSITE) },
  '39': { rest: [8, 8], l: sine(11, 680), r: sine(11, 680, OPPOSITE) },
  '40': { rest: [14, 14], l: scan(11, 700), r: scan(11, 700) },
  '41': {
    rest: [-58, -54],
    keys: [
      [0, 0],
      [-58, -54],
    ],
  },
  '62': { rest: [0, 44], r: sine(18, 700) },
  '64': { rest: [48, 46], l: pulse(10, 2600), r: pulse(10, 2600) },
  '65': { rest: [-36, -32] },
  '67': { rest: [54, 52], l: jitter(2, 16), r: jitter(2, 16) },
  '68': { rest: [20, 20], l: sine(20, 449), r: sine(20, 449, OPPOSITE) },
  '69': { rest: [8, 8], l: pulse(16, 524), r: pulse(16, 524) },
  '70': { rest: [26, 26], l: jitter(6, 14), r: jitter(6, 14) },
  '71': { rest: [-22, -20], l: sine(8, 1571), r: sine(8, 1571, OPPOSITE) },
};

function swings(plan: ArmPlan): AnimSpec[] {
  const out: AnimSpec[] = [];
  if (plan.l) out.push({ target: 'body', prop: 'armL', ...plan.l } as AnimSpec);
  if (plan.r) out.push({ target: 'body', prop: 'armR', ...plan.r } as AnimSpec);
  return out;
}

function armed(id: string, emotion: Emotion, plan: ArmPlan): Emotion {
  const added = swings(plan);
  const out: Emotion = {
    ...emotion,
    body: { ...(emotion.body as object | undefined), armL: plan.rest[0], armR: plan.rest[1] },
  };
  if (added.length) out.anims = [...((emotion.anims as AnimSpec[] | undefined) ?? []), ...added];
  const sequence = emotion.sequence as { frames: Array<Record<string, unknown>> } | undefined;
  const keys = plan.keys;
  if (keys && sequence) {
    if (keys.length !== sequence.frames.length) {
      throw new Error(`[MoodMates] Woody arm keys for emotion ${id} do not match its frames`);
    }
    out.sequence = {
      ...sequence,
      frames: sequence.frames.map((frame, i) => {
        const [armL, armR] = keys[i] as [number, number];
        return { ...frame, body: { ...(frame.body as object | undefined), armL, armR } };
      }),
    };
  }
  return out;
}

export function withArms(emotions: Record<string, Emotion>): Record<string, Emotion> {
  return Object.fromEntries(
    Object.entries(emotions).map(([id, emotion]) => {
      const plan = PLANS[id];
      return [id, plan ? armed(id, emotion, plan) : emotion];
    }),
  );
}

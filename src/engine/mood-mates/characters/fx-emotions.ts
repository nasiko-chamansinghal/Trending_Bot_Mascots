export interface EyeSlots {
  calm: string;
  wide: string;
  up: string;
  left: string;
  right: string;
  happy: string;
  squint: string;
}

export const BLOCK_SLOTS: EyeSlots = {
  calm: 'calm',
  wide: 'wide',
  up: 'lookUp',
  left: 'lookLeft',
  right: 'lookRight',
  happy: 'happy',
  squint: 'squint',
};

export const PUMPKIN_SLOTS: EyeSlots = {
  calm: 'calm',
  wide: 'round',
  up: 'pill',
  left: 'pill',
  right: 'pill',
  happy: 'arc',
  squint: 'pill',
};

const CLOSED_EYES = { open: 0, scaleX: 0.05, scaleY: 0.05 };
const OPEN_EYES = { open: 1, scaleX: 1, scaleY: 1 };
const SLOW_COLLAPSE: Array<[number, number]> = [
  [90, 0.55],
  [190, 0.28],
  [330, 0.1],
];
const QUICK_COLLAPSE: Array<[number, number]> = [
  [70, 0.5],
  [150, 0.22],
  [260, 0.08],
];

function emotion(o: Record<string, unknown>): Record<string, unknown> {
  return { transition: 420, ...o };
}

interface Collapse {
  transition?: number;
  pool: string[];
  lift: number;
  steps: Array<[number, number]>;
  end: number;
}

function collapsing({ transition, pool, lift, steps, end }: Collapse): Record<string, unknown> {
  return emotion({
    bare: true,
    gaze: false,
    transition,
    pool,
    blinkMs: null,
    body: { scale: 0, breathe: 0 },
    eyes: { both: CLOSED_EYES },
    sequence: {
      settle: 'hold',
      interp: 'linear',
      frames: [
        { at: 0, body: { scale: 1, y: lift }, eyes: { both: OPEN_EYES } },
        ...steps.map(([at, scale]) => ({ at, body: { scale } })),
        { at: end },
      ],
    },
  });
}

export function fxEmotions(s: EyeSlots): Record<string, Record<string, unknown>> {
  return {
    '60': collapsing({ pool: [s.calm], lift: 0, steps: SLOW_COLLAPSE, end: 480 }),
    '61': collapsing({ transition: 220, pool: [s.wide], lift: -4, steps: QUICK_COLLAPSE, end: 380 }),
    '62': emotion({
      transition: 360,
      pool: [s.left, s.wide, s.left],
      poolMs: [900, 1500],
      body: { rotate: 2 },
      anims: [{ target: 'eyes', prop: 'lookX', type: 'sine', amp: 4, period: 2200 }],
    }),
    '63': emotion({
      gaze: false,
      pool: [s.calm],
      blinkMs: null,
      anims: [
        { target: 'body', prop: 'scale', type: 'dip', amp: -0.87, period: 2400 },
        { target: 'eyes', prop: 'open', type: 'dip', amp: -1, period: 2400 },
      ],
    }),
    '64': emotion({
      transition: 200,
      pool: [s.wide, s.happy],
      poolMs: [1200, 1800],
      body: { scale: 1.02 },
      anims: [{ target: 'body', prop: 'scale', type: 'pulse', amp: 0.08, period: 2600 }],
    }),
    '65': emotion({
      gaze: false,
      pool: [s.wide],
      blinkMs: null,
      anims: [{ target: 'body', prop: 'rotate', type: 'turns', amp: 720, period: 3400, speed: 1700 }],
    }),
    '66': collapsing({ transition: 220, pool: [s.wide], lift: -4, steps: QUICK_COLLAPSE, end: 380 }),
    '67': emotion({
      transition: 300,
      gaze: false,
      pool: [s.squint],
      blinkMs: null,
      body: { scaleX: 0.85, scaleY: 1.25 },
      eyes: { both: { lookY: -6 } },
      anims: [
        { target: 'body', prop: 'y', type: 'arch', amp: -22, period: 2600 },
        { target: 'body', prop: 'x', type: 'sine', amp: 1.3, period: 126 },
      ],
    }),
    '68': emotion({
      transition: 260,
      pool: [s.calm, s.happy],
      poolMs: [1500, 2500],
      anims: [
        { target: 'body', prop: 'y', type: 'arch', amp: 14, period: 449 },
        { target: 'eyes', prop: 'lookY', type: 'arch', amp: 5, period: 449 },
      ],
    }),
    '69': emotion({
      pool: [s.happy],
      poolMs: [2500, 4000],
      blinkMs: null,
      anims: [
        { target: 'body', prop: 'scaleX', type: 'pulse', amp: 0.08, period: 524 },
        { target: 'body', prop: 'scaleY', type: 'pulse', amp: -0.06, period: 524 },
      ],
    }),
    '70': emotion({
      transition: 300,
      gaze: false,
      pool: [s.squint],
      blinkMs: null,
      body: { y: -5 },
      eyes: { both: { rotate: -12 } },
      anims: [
        { target: 'body', prop: 'x', type: 'sine', amp: 1.8, period: 140 },
        { target: 'body', prop: 'y', type: 'sine', amp: 1.8, period: 209, phase: Math.PI / 2 },
      ],
    }),
    '71': emotion({
      transition: 300,
      gaze: false,
      pool: [s.wide],
      blinkMs: null,
      body: { scale: 0.85 },
      anims: [
        { target: 'body', prop: 'rotate', type: 'spin', amp: 229 },
        { target: 'body', prop: 'scale', type: 'sine', amp: 0.15, period: 1571 },
        { target: 'eyes', prop: 'lookX', type: 'sine', amp: 7, period: 2094 },
        { target: 'eyes', prop: 'lookY', type: 'sine', amp: 5, period: 2094, phase: Math.PI / 2 },
      ],
    }),
  };
}

import type { AnimSpec } from '../../types';

export const NUBBY_BASE_ANIMS: AnimSpec[] = [
  { target: 'body', prop: 'rotate', type: 'sine', amp: 1.5, period: 4800 },
  { target: 'body', prop: 'scaleY', type: 'sine', amp: 0.012, period: 3600 },
  { target: 'body', prop: 'scaleX', type: 'sine', amp: 0.007, period: 3600, phase: Math.PI },
];

const slide = (amp: number, period: number, phase = 0): AnimSpec => ({
  target: 'eyes',
  prop: 'lookX',
  type: 'glance',
  amp,
  period,
  phase,
});

export const NUBBY_EMOTIONS: Record<string, Record<string, unknown>> = {
  '00': {
    desc: 'Eyes shut in soft crescents, body squashed low, bold Zs drifting up',
    pool: ['closed', 'closed2'],
    openness: 1,
    body: { y: 5, rotate: -1.5, scaleX: 1.03, scaleY: 0.965 },
    eyes: { both: { y: 6 } },
    anims: [
      { target: 'body', prop: 'scaleY', type: 'sine', amp: 0.02, period: 3400 },
      { target: 'body', prop: 'scaleX', type: 'sine', amp: 0.012, period: 3400, phase: Math.PI },
    ],
  },
  '01': {
    desc: 'Crescent eyes crack open through half-lids into round eyes as the body stretches awake',
    pool: ['closed'],
    sequence: {
      settle: { next: '02' },
      frames: [
        { at: 0, expr: 'closed', eyes: { both: { y: 5 } }, body: { y: 4, scaleX: 1.03, scaleY: 0.97 } },
        { at: 380, expr: 'sleepy', eyes: { both: { y: 3 } }, body: { y: 2, scaleX: 1.015, scaleY: 0.985 } },
        { at: 820, expr: 'calm2', eyes: { both: { y: 1, scaleX: 1.04, scaleY: 0.86 } }, body: { y: 0 } },
        {
          at: 1280,
          expr: 'calm',
          eyes: { both: { y: -1, scaleX: 1.1, scaleY: 1.12 } },
          body: { y: -2, scaleX: 0.985, scaleY: 1.03 },
        },
        { at: 1900, expr: 'calm', eyes: { both: { y: 0, scaleX: 1, scaleY: 1 } }, body: { y: 0 } },
      ],
    },
  },
  '02': {
    desc: 'Round eyes slide left and right with a slow breath and a tiny sway; now and then a happy hop',
    pool: ['calm', 'calm2'],
    poolMs: [3200, 6000],
    blinkMs: [3000, 7000],
    anims: [
      slide(12, 5600),
      { target: 'eyes', prop: 'lookY', type: 'sine', amp: 1.6, period: 4100, phase: 1.1 },
    ],
  },
  '03': {
    desc: 'Wide eyes peek side to side, body tilted and alert',
    pool: ['wide', 'calm', 'listen'],
    poolMs: [1600, 3000],
    body: { rotate: 5, scaleY: 1.02, scaleX: 0.99 },
    eyes: { both: { lookY: -1 } },
    anims: [slide(7, 2600)],
  },
  '04': {
    desc: 'Half-lidded eyes drift slowly, each its own way',
    pool: ['sleepy', 'calm2', 'squint'],
    poolMs: [3500, 6000],
    eyes: { left: { lookX: -4, lookY: 2 }, right: { lookX: 4, lookY: 1 } },
    anims: [slide(9, 7200)],
  },
  '06': {
    desc: 'Drowsy half-lids, body slumped low and dim, barely breathing',
    pool: ['sleepy', 'closed'],
    openness: 0.85,
    body: { y: 6, scale: 0.98, rotate: -1, color: '@dim', scaleY: 0.985, scaleX: 1.012 },
    eyes: { both: { y: 5 } },
  },
  '10': {
    desc: 'Smiling ^ ^ eyes, body bouncing lightly, an occasional happy hop',
    pool: ['happy', 'happy2'],
    body: { y: -3, color: '@soft' },
    eyes: { both: { y: -2 } },
    anims: [
      { target: 'body', prop: 'y', type: 'sine', amp: 2.6, period: 1300 },
      { target: 'body', prop: 'scaleY', type: 'sine', amp: 0.03, period: 1300, phase: 1.6 },
      { target: 'eyes', prop: 'lookY', type: 'glance', amp: 3, period: 3000 },
    ],
  },
  '11': {
    desc: 'Skeptical eyes, one big and one small, body tilted',
    pool: ['squint2', 'calm2', 'squint'],
    eyes: {
      left: { y: -4, scaleX: 1.08, scaleY: 1.12 },
      right: { y: 3, scaleX: 0.92, scaleY: 0.9, lookX: 3 },
    },
  },
  '12': {
    desc: 'Sad slanted eyes sink low, body slumped and dim',
    pool: ['sad', 'sleepy', 'closed2'],
    body: { y: 5, rotate: -4, color: '@dim', scaleY: 0.98, scaleX: 1.015 },
    eyes: { both: { y: 9, lookY: 4 } },
  },
  '13': {
    desc: 'Eyes pop wide and the body stretches tall in an instant',
    pool: ['wide', 'wide2'],
    eyes: { both: { scaleX: 1.12, scaleY: 1.12, y: -3, lookY: -2 } },
    body: { y: -4, scale: 1.03, scaleY: 1.04, scaleX: 0.98 },
  },
  '14': {
    desc: 'Eyes slip to one side as the body blushes pink',
    pool: ['shy', 'calm2', 'closed2'],
    eyes: { both: { y: 5, lookX: 10, lookY: 3 } },
    anims: [slide(3, 2600)],
  },
  '15': {
    desc: 'Heavy half-lids, body slumped and dim',
    pool: ['sleepy', 'closed2', 'closed'],
    openness: 0.9,
    body: { y: 4, rotate: -3, color: '@dim', scaleY: 0.975, scaleX: 1.02 },
    eyes: { both: { y: 5, lookY: 3 } },
  },
  '16': {
    desc: 'Narrow steady eyes converge, body almost motionless',
    pool: ['squint', 'squint2', 'sleepy'],
    eyes: { left: { x: 4 }, right: { x: -4 } },
  },
  '17': {
    desc: 'Wide eyes dart about while the whole body quivers',
    pool: ['wide', 'wide2'],
    anims: [
      { target: 'eyes', prop: 'lookX', type: 'jitter', amp: 7, speed: 11 },
      { target: 'eyes', prop: 'lookY', type: 'jitter', amp: 4, speed: 9 },
      { target: 'body', prop: 'x', type: 'jitter', amp: 1.8, speed: 8 },
      { target: 'body', prop: 'scaleY', type: 'jitter', amp: 0.02, speed: 12 },
    ],
  },
  '18': {
    desc: 'Half-lidded eyes roll up and away, head cocked',
    pool: ['squint', 'squint2', 'sad'],
    body: { rotate: 8, y: 2 },
    eyes: { both: { lookX: 9, lookY: -6 } },
  },
  '19': {
    desc: 'Calm eyes nod up and down in steady approval',
    pool: ['scan2', 'calm2', 'happy'],
    body: { color: '@soft' },
  },
  '20': {
    desc: 'Mismatched eyes that never quite agree',
    pool: ['squint2', 'calm2', 'squint'],
    eyes: {
      left: { scaleX: 1.12, scaleY: 1.18, y: -3, lookX: -3 },
      right: { scaleX: 0.84, scaleY: 0.8, y: 4, lookX: 5 },
    },
  },
  '21': {
    desc: 'Round eyes narrow to a slit, then snap into slanted glares as the body flushes red',
    pool: ['angry', 'angry2'],
    eyes: { both: { y: 11, scaleX: 1.08, scaleY: 1.1 } },
    sequence: {
      settle: 'hold',
      frames: [
        { at: 0, expr: 'calm', body: { color: '@base' } },
        { at: 70, expr: 'squint2', body: { color: '@base' } },
        { at: 150, expr: 'closed2', body: { color: '@base' } },
        { at: 230, expr: 'angry', exprSpeed: 12, body: { color: '@angry' } },
        { at: 520, expr: 'angry', body: { color: '@angry' } },
      ],
    },
  },
  '30': {
    pool: ['calm2', 'squint', 'listen', 'scan2'],
    anims: [slide(12, 2800), { target: 'eyes', prop: 'lookY', type: 'sine', amp: 1.2, period: 2200 }],
  },
  '32': {
    desc: 'Narrow eyes loop in tight little circuits',
    pool: ['squint', 'scan2', 'calm2'],
    anims: [
      { target: 'eyes', prop: 'lookX', type: 'sine', amp: 9, period: 1200 },
      { target: 'eyes', prop: 'lookY', type: 'sine', amp: 4, period: 900, phase: 0.8 },
    ],
  },
  '34': {
    desc: 'Wide eyes as the body flashes red twice and settles on alarm',
    pool: ['wide', 'wide2'],
    anims: [{ target: 'eyes', prop: 'lookX', type: 'jitter', amp: 2, speed: 8, decay: 800 }],
  },
  '38': {
    desc: 'A lowered sidelong gaze and a firm head-shake on entry: the answer is no',
    pool: ['squint', 'squint2', 'sad'],
    openness: 0.85,
  },
  '39': {
    desc: 'Reading eyes pulse in time with the output',
    pool: ['scan', 'scan2'],
    anims: [
      { target: 'eyes', prop: 'scaleY', type: 'pulse', amp: 0.16, period: 340 },
      { target: 'body', prop: 'y', type: 'sine', amp: 1.4, period: 680 },
    ],
  },
  '41': {
    desc: 'Eyes close to slits, the body dims to grey and quietly freezes',
    pool: ['closed', 'closed2'],
    openness: 1,
    sequence: {
      settle: 'hold',
      frames: [{ at: 0 }, { at: 1500, body: { y: 4, scale: 0.97, scaleX: 1.02, scaleY: 0.975 } }],
    },
  },
  '40': {
    pool: ['scan', 'scan2', 'scan3', 'wide', 'squint'],
    anims: [{ target: 'eyes', prop: 'lookX', type: 'scan', amp: 18, period: 800 }],
  },
  '33': { desc: 'Smiling eyes and a happy hop, with a burst of little squares' },
};

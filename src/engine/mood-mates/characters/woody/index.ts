import { solidRestOutline } from '../../solid/render';
import type { AnimSpec, CharacterRaw } from '../../types';
import { type EyeSlots, fxEmotions } from '../fx-emotions';
import { grokEmotions } from '../pumpkin/emotions';
import { WOODY_MOTION, WOODY_RINGS } from './eyes';
import { WOODY_PALETTE } from './palette';
import { WOODY_SPEC } from './spec';

const WOODY_SLOTS: EyeSlots = {
  calm: 'calm',
  wide: 'g3',
  up: 'g8',
  left: 'g16',
  right: 'g16',
  happy: 'g19',
  squint: 'g7',
};

const GROK = grokEmotions(WOODY_MOTION);

const WOODY_BASE_ANIMS: AnimSpec[] = [
  { target: 'body', prop: 'armL', type: 'sine', amp: 3, period: 3600 },
  { target: 'body', prop: 'armR', type: 'sine', amp: 3, period: 3600, phase: 2.5 },
  { target: 'body', prop: 'rotate', type: 'sine', amp: 0.8, period: 5200 },
];

export const woody: CharacterRaw = {
  id: 'woody',
  name: 'Woody',
  industry: 'general',
  desc: 'An orange block of wood with its arms up, cut-notch eyes and a body that turns like a real 3D slab',
  body: { type: 'outline', vertices: solidRestOutline(WOODY_SPEC), radius: 0.5, arcSteps: 2, edgeStep: 6 },
  solid: WOODY_SPEC,
  material: 'flat',
  face: { x: 0, y: 0, sx: 1, sy: 1, eye: 1, contain: 0 },
  palette: WOODY_PALETTE,
  eyeShapes: {},
  eyeRings: WOODY_RINGS,
  blink: [],
  blinkStyle: 'open',
  poseDefaults: { body: { turn: 0, pitch: 0 } },
  bounceScale: WOODY_MOTION,
  gazeRange: [24 * WOODY_MOTION, 15 * WOODY_MOTION],
  baseAnims: WOODY_BASE_ANIMS,
  emotions: { ...GROK, '02': { ...GROK['02'], pool: ['calm'] }, ...fxEmotions(WOODY_SLOTS) },
};

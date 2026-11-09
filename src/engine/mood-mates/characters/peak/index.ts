import { solidRestOutline } from '../../solid/render';
import type { AnimSpec, CharacterRaw } from '../../types';
import { type EyeSlots, fxEmotions } from '../fx-emotions';
import { grokEmotions } from '../pumpkin/emotions';
import { rumble, survey, wring } from './clips';
import { PEAK_MOTION, PEAK_RINGS } from './eyes';
import { PEAK_PALETTE } from './palette';
import { PEAK_SPEC } from './spec';

const PEAK_SLOTS: EyeSlots = {
  calm: 'calm',
  wide: 'g3',
  up: 'g8',
  left: 'g16',
  right: 'g16',
  happy: 'g19',
  squint: 'g7',
};

const GROK = grokEmotions(PEAK_MOTION);

const PEAK_BASE_ANIMS: AnimSpec[] = [
  { target: 'body', prop: 'rotate', type: 'sine', amp: 0.8, period: 5200 },
];

export const peak: CharacterRaw = {
  id: 'peak',
  name: 'Peaky',
  industry: 'general',
  desc: 'A pink-and-peach mountain with a crooked two-peak crown and two tall oval eyes, built as a solid that turns in 3D',
  body: { type: 'outline', vertices: solidRestOutline(PEAK_SPEC), radius: 0.5, arcSteps: 2, edgeStep: 6 },
  solid: PEAK_SPEC,
  material: 'flat',
  face: { x: 0, y: 0, sx: 1, sy: 1, eye: 1, contain: 0 },
  palette: PEAK_PALETTE,
  eyeShapes: {},
  eyeRings: PEAK_RINGS,
  blink: [],
  blinkStyle: 'open',
  poseDefaults: { body: { turn: 0, pitch: 0 } },
  bounceScale: PEAK_MOTION,
  gazeRange: [24 * PEAK_MOTION, 15 * PEAK_MOTION],
  baseAnims: PEAK_BASE_ANIMS,
  clips: { rumble, survey, wring },
  signatureClips: ['rumble', 'survey', 'wring'],
  emotions: { ...GROK, '02': { ...GROK['02'], pool: ['calm'] }, ...fxEmotions(PEAK_SLOTS) },
};

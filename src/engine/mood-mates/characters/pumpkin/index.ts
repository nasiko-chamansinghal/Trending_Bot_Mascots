import { solidRestOutline } from '../../solid/render';
import type { CharacterRaw } from '../../types';
import { joyFoldBoing, jumpSpin } from './clips';
import { GROK_MOTION, PUMPKIN_GROK_EMOTIONS } from './emotions';
import { PUMPKIN_RINGS } from './eyes';
import { PUMPKIN_PALETTE } from './palette';
import { PUMPKIN_SHOW } from './show';
import { PUMPKIN_SPEC } from './spec';
import { PUMPKIN_GROUPS, PUMPKIN_HAPPY } from './states';

export const pumpkin: CharacterRaw = {
  id: 'pumpkin',
  name: 'Pumpkin',
  industry: 'general',
  desc: 'A carved orange pumpkin that turns, nods and spins like a real 3D head — its eyes wrap around the curve',
  body: { type: 'outline', vertices: solidRestOutline(PUMPKIN_SPEC), radius: 0.5, arcSteps: 2, edgeStep: 6 },
  solid: PUMPKIN_SPEC,
  material: 'flat',
  face: { x: 0, y: 0, sx: 1, sy: 1, eye: 1, contain: 0 },
  palette: PUMPKIN_PALETTE,
  eyeShapes: {},
  eyeRings: PUMPKIN_RINGS,
  blink: [],
  blinkStyle: 'open',
  poseDefaults: { body: { turn: 0, pitch: 0 } },
  bounceScale: GROK_MOTION,
  gazeRange: [24 * GROK_MOTION, 15 * GROK_MOTION],
  emotions: PUMPKIN_GROK_EMOTIONS,
  extraEmotions: [...PUMPKIN_SHOW, ...PUMPKIN_HAPPY],
  emotionGroups: PUMPKIN_GROUPS,
  clips: { jumpSpin, joyFoldBoing },
  signatureClips: ['jumpSpin', 'joyFoldBoing'],
};

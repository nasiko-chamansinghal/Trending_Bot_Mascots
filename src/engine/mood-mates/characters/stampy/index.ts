import type { CharacterRaw } from '../../types';
import { BLOCK_SLOTS, fxEmotions } from '../fx-emotions';
import { cardFlip, cornerPeel } from './clips';
import { STAMPY_BASE_ANIMS, STAMPY_EMOTIONS, STAMPY_JOY } from './emotions';
import { STAMPY_RINGS } from './eyes';
import { STAMPY_PALETTE } from './palette';
import { STAMPY_BODY } from './shape';
import { STAMPY_STATES, STATE_GROUPS, STATE_PROPS } from './states';

export const stampy: CharacterRaw = {
  id: 'stampy',
  name: 'Stampy',
  industry: 'general',
  desc: 'A little lime postage stamp with perforated edges and two tilted pill eyes — no mouth, all feeling in the eyes',
  body: { type: 'stamp', stamp: STAMPY_BODY, edgeStep: 2 },
  material: 'flat',
  tint: { top: ['#F0FFBE', 0.55], bottom: ['#2F9A3A', 0.6] },
  face: { x: 0, y: 0, sx: 1, sy: 1, eye: 1, level: 0, contain: 16 },
  palette: STAMPY_PALETTE,
  eyeShapes: {},
  eyeRings: STAMPY_RINGS,
  gazeRange: [8, 6],
  blink: [
    { slot: 'lidDrop', ms: 34 },
    { slot: 'closed', ms: 40 },
    { slot: 'squash', ms: 40 },
  ],
  props: [...STATE_PROPS],
  extraEmotions: [...STAMPY_STATES, STAMPY_JOY],
  emotionGroups: STATE_GROUPS,
  backFace: { lighten: 0.55, text: '$' },
  clips: { cornerPeel, cardFlip },
  signatureClips: ['cornerPeel', 'cardFlip'],
  baseAnims: STAMPY_BASE_ANIMS,
  emotions: { ...STAMPY_EMOTIONS, ...fxEmotions(BLOCK_SLOTS, [1, 1.12]) },
};

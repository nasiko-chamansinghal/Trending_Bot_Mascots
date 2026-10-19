import type { CharacterRaw } from '../../types';
import { cardFlip, cornerPeel } from './clips';
import { STAMPY_BASE_ANIMS, STAMPY_EMOTIONS } from './emotions';
import { STAMPY_EYES } from './eyes';
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
  face: { x: 0, y: 0, sx: 1, sy: 1, eye: 1, projection: 'plane', level: 0, contain: 16 },
  palette: STAMPY_PALETTE,
  eyeStyle: {
    dx: 25,
    cy: 100,
    w: 38,
    h: 64,
    taper: 0.5,
    tilt: 0,
    bend: 0,
    highlight: null,
    pupil: null,
  },
  eyeShapes: STAMPY_EYES,
  features: { blush: false },
  gazeRange: [8, 6],
  blink: [
    { slot: 'lidDrop', ms: 34 },
    { slot: 'closed', ms: 40 },
    { slot: 'squash', ms: 40 },
  ],
  props: [...STATE_PROPS],
  extraEmotions: STAMPY_STATES,
  emotionGroups: STATE_GROUPS,
  backFace: { lighten: 0.55, text: '$' },
  clips: { cornerPeel, cardFlip },
  signatureClips: ['cornerPeel', 'cardFlip'],
  baseAnims: STAMPY_BASE_ANIMS,
  emotions: STAMPY_EMOTIONS,
  emotionMode: 'replace',
};

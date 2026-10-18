import type { CharacterRaw } from '../../types';
import { happyWaddle, hopHopPop, shyPeek } from './clips';
import { NUBBY_BASE_ANIMS, NUBBY_EMOTIONS } from './emotions';
import { NUBBY_EYE_SHAPES } from './eyes';
import { NUBBY_PALETTE } from './palette';
import { NUBBY_CORNER_RADIUS, NUBBY_VERTICES } from './shape';
import { VIDEO_EMOTIONS, VIDEO_GROUPS, VIDEO_PROPS } from './video';

export const nubby: CharacterRaw = {
  id: 'nubby',
  name: 'Nubby',
  industry: 'general',
  desc: 'A chunky stair-stepped block on two stubby legs, with two big round eyes and no mouth — it says everything with its eyes and its body',
  body: { type: 'outline', vertices: NUBBY_VERTICES, radius: NUBBY_CORNER_RADIUS },
  material: 'flat',
  face: { x: 10.32, y: 0, sx: 1, sy: 1, eye: 1, projection: 'plane', level: 1 },
  palette: NUBBY_PALETTE,
  eyeStyle: {
    dx: 21.27,
    cy: 82.55,
    w: 21.25,
    h: 20.72,
    taper: 0.5,
    tilt: 0,
    bend: 0,
    highlight: null,
    pupil: null,
  },
  eyeShapes: NUBBY_EYE_SHAPES,
  features: { blush: false },
  fxSkin: 'blockpop',
  zzz: { glyph: 'Z', italic: false, weight: '800', size: 1.9, opacity: 1 },
  props: VIDEO_PROPS,
  extraEmotions: VIDEO_EMOTIONS,
  emotionGroups: VIDEO_GROUPS,
  baseAnims: NUBBY_BASE_ANIMS,
  emotions: NUBBY_EMOTIONS,
  clips: { hopHopPop, happyWaddle, shyPeek },
  signatureClips: ['hopHopPop', 'happyWaddle', 'shyPeek'],
};

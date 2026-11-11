import type { CharacterRaw } from '../../types';
import { BLOCK_SLOTS, fxEmotions } from '../fx-emotions';
import { marbleEyes, peekabooPop } from './clips';
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
  tint: { top: ['#9BE0A4', 0.5], bottom: ['#1E5A3C', 0.55] },
  face: { x: 0, y: 0, sx: 1, sy: 1, eye: 1, level: 1, contain: 14 },
  palette: NUBBY_PALETTE,
  eyeShapes: NUBBY_EYE_SHAPES,
  gazeRange: [10, 7],
  blink: [
    { slot: 'blinkHalf', ms: 34 },
    { slot: 'closed', ms: 40 },
    { slot: 'squash', ms: 40 },
  ],
  fxSkin: 'blockpop',
  zzz: { glyph: 'Z', italic: false, weight: '800', size: 1.9, opacity: 1 },
  props: VIDEO_PROPS,
  extraEmotions: VIDEO_EMOTIONS,
  emotionGroups: VIDEO_GROUPS,
  baseAnims: NUBBY_BASE_ANIMS,
  emotions: { ...NUBBY_EMOTIONS, ...fxEmotions(BLOCK_SLOTS, [1.15, 1.65]) },
  clips: { peekabooPop, marbleEyes },
  signatureClips: ['peekabooPop', 'marbleEyes'],
};

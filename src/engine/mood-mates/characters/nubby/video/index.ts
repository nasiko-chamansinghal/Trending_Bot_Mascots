import { lerpColor } from '../../../../shared/math';
import type { EmotionGroup, EmotionRaw, PropDef } from '../../../types';
import { NUBBY_PALETTE } from '../palette';
import { type VideoData, videoEmotion } from './decode';
import glare from './glare.json';
import grumpy from './grumpy.json';
import joy from './joy.json';
import look from './look-around.json';
import { LOADING_BLOCKS, SNOOZING, TYPING } from './loops';
import cycle from './mood-cycle.json';
import fade from './mood-fade.json';

export const VIDEO_GROUPS: EmotionGroup[] = [{ key: 'video', name: 'Video States' }];

export const VIDEO_PROPS: PropDef[] = [
  { id: 'box1', kind: 'box', color: 'body' },
  { id: 'box2', kind: 'box', color: 'body' },
  { id: 'me', kind: 'box', color: 'body' },
  { id: 'bubble', kind: 'bubble', color: 'body', dotColor: 'eye' },
  { id: 'zA', kind: 'glyph', text: 'Z', color: 'body' },
  { id: 'zB', kind: 'glyph', text: 'Z', color: 'body' },
  { id: 'zC', kind: 'glyph', text: 'Z', color: 'body' },
];

const { base, dim } = NUBBY_PALETTE.states;

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
}

function fadeToDim(frames: VideoData['frames']) {
  const settled = frames.findIndex((k) => k[1].toLowerCase() === base.toLowerCase());
  const top = luminance(base);
  return (color: string, i: number) =>
    i < settled ? color : lerpColor(base, dim, 1 - Math.min(1, luminance(color) / top));
}

const toBase = () => base;
const LOOP = { hold: 700, back: 600 };

export const VIDEO_EMOTIONS: EmotionRaw[] = [
  videoEmotion(
    {
      id: '50',
      name: 'Mood Fade',
      desc: 'The mood drains away: pink fades to grey, then green, then a dim green while the eyes squash shut and reopen sleepy',
    },
    fade as unknown as VideoData,
    {
      posterIndex: 0,
      zoomCap: 0.99,
      bodyColor: fadeToDim((fade as unknown as VideoData).frames),
      loop: LOOP,
    },
  ),
  videoEmotion(
    {
      id: '51',
      name: 'Glare',
      desc: 'Round eyes tilt, squeeze to a slit, then snap into a slanted glare while the eyes slowly drift',
    },
    glare as unknown as VideoData,
    { posterIndex: 35, bodyColor: toBase, loop: LOOP },
  ),
  SNOOZING,
  videoEmotion(
    {
      id: '53',
      name: 'Mood Cycle',
      desc: 'Cycles pink, grey and green, with a blink at each end of the swing',
    },
    cycle as unknown as VideoData,
    { from: 11, posterIndex: 11 },
  ),
  videoEmotion(
    {
      id: '54',
      name: 'Grumpy',
      desc: 'A slanted glare that squints for a moment, then snaps back to glaring',
    },
    grumpy as unknown as VideoData,
    { from: 2, posterIndex: 53, bodyColor: toBase, loop: LOOP },
  ),
  TYPING,
  videoEmotion(
    {
      id: '56',
      name: 'Joy',
      desc: 'Smiling ^ ^ eyes that slide happily across the face',
    },
    joy as unknown as VideoData,
    { posterIndex: 83, bodyColor: toBase, loop: LOOP },
  ),
  videoEmotion(
    {
      id: '57',
      name: 'Look Around',
      desc: 'Round eyes look to one side, blink, then sweep across to the other',
    },
    look as unknown as VideoData,
    { posterIndex: 83, bodyColor: toBase, loop: LOOP },
  ),
  LOADING_BLOCKS,
];

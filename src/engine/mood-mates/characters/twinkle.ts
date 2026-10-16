import type { CharacterRaw } from '../types';

export const twinkle: CharacterRaw = {
  id: 'twinkle',
  name: 'Twinkle',
  industry: 'general',
  desc: 'A honey-gold rounded star in tiny auto-fit glasses — the classroom cheerleader',
  body: { type: 'star', r: 1.02, points: 5, inner: 0.74, sharp: 0.5 },
  face: { x: 0, y: 6, sx: 0.82, sy: 0.82, eye: 0.85 },
  palette: {
    body: '#F5B93F',
    eye: '#4A3316',
    blush: '#F0966E',
    mouth: '#6B4A2E',
    zzz: '#D9A85F',
    gloss: 0.3,
    states: {
      base: '#F5B93F',
      dim: '#D6A139',
      soft: '#F8CC66',
      blush: '#F2AE7E',
      angry: '#E8734F',
      alert: '#E25B5B',
      off: '#C2A265',
    },
  },
  eyeStyle: {
    dx: 27,
    cy: 102,
    w: 26,
    h: 34,
    taper: 0.38,
    tilt: 0,
    bend: 0,
    pupil: {
      irisR: 10,
      pupilR: 4.8,
      irisColor: '#7A4E2A',
      socket: '#FFFFFF',
      highlights: [
        { dx: -3.2, dy: -3.8, r: 3 },
        { dx: 3.8, dy: 2.4, r: 1.3, opacity: 0.6 },
      ],
    },
  },
  features: {
    mouth: { w: 24, dy: 34 },
    blush: { dx: 40, dy: 24, rx: 10, ry: 6, max: 0.85 },
    accessories: [{ kind: 'glasses', color: '#C9973F', fit: 1.3, strokeWidth: 2.6, glintPeriod: 5200 }],
  },
  fxSkin: 'stardust',
  emotions: { '33': { body: { spinFx: 1, confetti: 1 } } },
};

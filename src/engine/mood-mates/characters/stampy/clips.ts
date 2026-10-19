import { easeInOutCubic, easeOutBack, smooth, span } from '../../motion';
import type { ClipDef } from '../../types';

export const cornerPeel: ClipDef = {
  duration: 1300,
  sample(t) {
    let peel = 0;
    if (t < 480) peel = easeOutBack(span(t, 60, 480));
    else if (t < 820) peel = 1 + 0.04 * Math.sin(((t - 480) / 340) * Math.PI * 2);
    else peel = 1 - span(t, 820, 930) ** 2;
    const pat = t > 930 && t < 1180 ? Math.sin(span(t, 930, 1180) * Math.PI) : 0;
    return {
      peel: Math.max(0, peel),
      rotate: -2 * smooth(span(t, 60, 400)) * (1 - span(t, 820, 930)),
      sx: 1 + 0.06 * pat,
      sy: 1 - 0.08 * pat,
      dy: 2 * pat,
    };
  },
  expr: [
    { at: 120, expr: 'lookDown', speed: 9 },
    { at: 560, expr: 'wide', speed: 10 },
    { at: 900, expr: 'squash', speed: 26 },
    { at: 1080, expr: 'happy', speed: 12 },
    { at: 1240, expr: 'calm', speed: 9 },
  ],
};

export const cardFlip: ClipDef = {
  duration: 1080,
  sample(t) {
    const u = easeInOutCubic(span(t, 80, 900));
    const c = Math.cos(u * Math.PI * 2);
    const lift = Math.sin(span(t, 40, 960) * Math.PI);
    const land = t > 900 ? Math.sin(span(t, 900, 1080) * Math.PI) : 0;
    return {
      sx: Math.max(Math.abs(c), 0.03) * (1 + 0.05 * land),
      sy: 1 - 0.07 * land,
      dy: -16 * lift,
      rotate: 6 * Math.sin(u * Math.PI * 2),
      flip: c < 0 ? 1 : 0,
    };
  },
  expr: [
    { at: 0, expr: 'wide', speed: 12 },
    { at: 860, expr: 'squash', speed: 26 },
    { at: 960, expr: 'smug', speed: 12 },
    { at: 1060, expr: 'calm', speed: 9 },
  ],
};

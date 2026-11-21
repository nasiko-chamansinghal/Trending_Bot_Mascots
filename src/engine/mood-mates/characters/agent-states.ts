import {
  DONE_PREVIEW,
  doneFrames,
  WORK_LOOP_FROM_MS,
  WORK_PREVIEW,
  workFrames,
} from '../../shared/agent-frames';
import type { EyeSlots } from './fx-emotions';

export function agentStates(s: EyeSlots): Record<string, Record<string, unknown>> {
  return {
    '32': {
      transition: 360,
      gaze: false,
      pool: [s.squint],
      blinkMs: [2800, 5500],
      anims: [
        { target: 'body', prop: 'y', type: 'sine', amp: 0.9, period: 700 },
        { target: 'eyes', prop: 'lookX', type: 'glance', amp: 4, period: 1240 },
        { target: 'eyes', prop: 'lookY', type: 'sine', amp: 2, period: 1700 },
      ],
      preview: WORK_PREVIEW,
      sequence: { settle: 'hold', interp: 'linear', loopFrom: WORK_LOOP_FROM_MS, frames: workFrames() },
    },
    '33': {
      transition: 300,
      pool: [s.happy, s.calm],
      poolMs: [1400, 2600],
      blinkMs: [2200, 4500],
      preview: DONE_PREVIEW,
      sequence: { settle: 'hold', interp: 'linear', loopFrom: 0, frames: doneFrames() },
    },
  };
}

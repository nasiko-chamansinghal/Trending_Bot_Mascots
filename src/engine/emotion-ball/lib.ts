import { EmotionBall } from './index';

declare global {
  interface Window {
    EmotionBall: typeof EmotionBall;
  }
}

window.EmotionBall = EmotionBall;

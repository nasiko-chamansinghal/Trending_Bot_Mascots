import { MoodMates } from './index';

declare global {
  interface Window {
    MoodMates: typeof MoodMates;
  }
}

window.MoodMates = MoodMates;

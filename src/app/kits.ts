import { EmotionBall } from '../engine/emotion-ball';
import { MoodMates } from '../engine/mood-mates';
import type { DefLike, EmotionConfigApi } from './engine-types';

export { EmotionBall, MoodMates };

export const moodMatesConfig: EmotionConfigApi = {
  list: (group) => MoodMates.config.list(group) as DefLike[],
  groups: () => MoodMates.config.groups(),
  def: (id) => MoodMates.config.getRaw(id) as DefLike | null,
  exportConfig: () => MoodMates.config.exportConfig(),
  importConfig: (json) => MoodMates.config.importConfig(json),
};

export const emotionBallConfig: EmotionConfigApi = {
  list: (group) => EmotionBall.config.list(group) as DefLike[],
  groups: () => EmotionBall.config.groups(),
  def: (id) => EmotionBall.config.get(id) as DefLike | null,
  exportConfig: () => EmotionBall.config.exportConfig(),
  importConfig: (json) => EmotionBall.config.importConfig(json),
};

import { createBall } from './ball';
import { config, create, EmotionEngine, version } from './engine';
import { mountHeroParticles } from './hero-particles';

export const EmotionBall = { create, version, config, createBall };

export type { EngineOptions } from './engine';
export { EmotionEngine, mountHeroParticles };

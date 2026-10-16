import { nimbo } from './characters/nimbo';
import { twinkle } from './characters/twinkle';
import { characters, config, create, EmotionEngine, version } from './engine';
import { createFeatures, type FeatureCtx } from './features';
import { createFx, listSkins, registerSkin } from './fx';
import * as geo from './geometry';
import { createBall } from './render';
import type { Features } from './types';
import { centroid, ringPath, shade } from './util';

characters.register(nimbo);
characters.register(twinkle);

export const MoodMates = {
  create,
  version,
  createBall,
  createFeatures: (_bodyG: unknown, feats: Features, ctx: FeatureCtx) => createFeatures(feats, ctx),
  characters,
  config,
  geo,
  createFx: Object.assign(createFx, { registerSkin, skins: listSkins }),
  util: { shade, ringPath, centroid },
};

export type { EngineOptions } from './engine';
export { EmotionEngine };

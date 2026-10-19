import { nimbo } from './characters/nimbo';
import { nubby } from './characters/nubby';
import { blockpop } from './characters/nubby/skin';
import { stampy } from './characters/stampy';
import { twinkle } from './characters/twinkle';
import { characters, config, create, EmotionEngine, version } from './engine';
import { createFeatures, type FeatureCtx } from './features';
import { createFx, listSkins, registerSkin } from './fx';
import * as geo from './geometry';
import { getMaterial, listMaterials, registerMaterial } from './materials';
import { createBall } from './render';
import type { Features } from './types';
import { centroid, ringPath, shade } from './util';

registerSkin('blockpop', blockpop);
characters.register(nimbo);
characters.register(twinkle);
characters.register(nubby);
characters.register(stampy);

export const MoodMates = {
  create,
  version,
  createBall,
  createFeatures: (_bodyG: unknown, feats: Features, ctx: FeatureCtx) => createFeatures(feats, ctx),
  characters,
  config,
  geo,
  createFx: Object.assign(createFx, { registerSkin, skins: listSkins }),
  materials: { register: registerMaterial, get: getMaterial, list: listMaterials },
  util: { shade, ringPath, centroid },
};

export type { EngineOptions } from './engine';
export { EmotionEngine };

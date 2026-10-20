import { nubby } from './characters/nubby';
import { blockpop } from './characters/nubby/skin';
import { pumpkin } from './characters/pumpkin';
import { stampy } from './characters/stampy';
import { characters, config, create, EmotionEngine, version } from './engine';
import { registerSkin } from './fx';
import * as geo from './geometry';
import { getMaterial, registerMaterial } from './materials';
import { createBall } from './render';
import { centroid, ringPath, shade } from './util';

registerSkin('blockpop', blockpop);
characters.register(nubby);
characters.register(stampy);
characters.register(pumpkin);

export const MoodMates = {
  create,
  version,
  createBall,
  characters,
  config,
  geo,
  registerSkin,
  materials: { register: registerMaterial, get: getMaterial },
  util: { shade, ringPath, centroid },
};

export type { EngineOptions } from './engine';
export { EmotionEngine };

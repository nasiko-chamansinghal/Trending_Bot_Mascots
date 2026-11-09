import { bloom } from './characters/bloom';
import { ghosty } from './characters/ghosty';
import { nubby } from './characters/nubby';
import { blockpop } from './characters/nubby/skin';
import { peak } from './characters/peak';
import { pumpkin } from './characters/pumpkin';
import { stampy } from './characters/stampy';
import { woody } from './characters/woody';
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
characters.register(woody);
characters.register(peak);
characters.register(ghosty);
characters.register(bloom);

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

import { bao } from './characters/bao';
import { blaze } from './characters/blaze';
import { blobby } from './characters/blobby';
import { bloom } from './characters/bloom';
import { bunni } from './characters/bunni';
import { cheeky } from './characters/cheeky';
import { cheffy } from './characters/cheffy';
import { dewy } from './characters/dewy';
import { drip } from './characters/drip';
import { ember } from './characters/ember';
import { flame } from './characters/flame';
import { fuzzy } from './characters/fuzzy';
import { germy } from './characters/germy';
import { ghosty } from './characters/ghosty';
import { glowy } from './characters/glowy';
import { googly } from './characters/googly';
import { hexo } from './characters/hexo';
import { inky } from './characters/inky';
import { jelo } from './characters/jelo';
import { limey } from './characters/limey';
import { mokey } from './characters/mokey';
import { ninjo } from './characters/ninjo';
import { nubby } from './characters/nubby';
import { blockpop } from './characters/nubby/skin';
import { peak } from './characters/peak';
import { pumpkin } from './characters/pumpkin';
import { spiky } from './characters/spiky';
import { stampy } from './characters/stampy';
import { tufty } from './characters/tufty';
import { wispy } from './characters/wispy';
import { compileDesign, sanitizeDesign } from './design';
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
characters.register(peak);
characters.register(ghosty);
characters.register(bloom);
characters.register(hexo);
characters.register(ninjo);
characters.register(jelo);
characters.register(drip);
characters.register(flame);
characters.register(germy);
characters.register(spiky);
characters.register(mokey);
characters.register(inky);
characters.register(dewy);
characters.register(tufty);
characters.register(ember);
characters.register(cheffy);
characters.register(bunni);
characters.register(blaze);
characters.register(glowy);
characters.register(googly);
characters.register(wispy);
characters.register(cheeky);
characters.register(blobby);
characters.register(fuzzy);
characters.register(limey);
characters.register(bao);

function registerDesign(raw: unknown): string | null {
  const design = sanitizeDesign(raw);
  if (!design) return null;
  return characters.register(compileDesign(design)).ok ? design.id : null;
}

export const MoodMates = {
  create,
  version,
  createBall,
  registerDesign,
  characters,
  config,
  geo,
  registerSkin,
  materials: { register: registerMaterial, get: getMaterial },
  util: { shade, ringPath, centroid },
};

export type { EngineOptions } from './engine';
export { EmotionEngine };

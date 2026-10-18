import { flat } from './flat';
import { gloss } from './gloss';
import { registerMaterial } from './registry';

registerMaterial('gloss', gloss);
registerMaterial('flat', flat);

export { getMaterial, listMaterials, registerMaterial } from './registry';
export type { Material, MaterialContext, MaterialInstance } from './types';

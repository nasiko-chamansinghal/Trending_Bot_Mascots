import { flat } from './flat';
import { registerMaterial } from './registry';

registerMaterial('flat', flat);

export { getMaterial, registerMaterial } from './registry';
export type { Material, MaterialContext, MaterialInstance } from './types';

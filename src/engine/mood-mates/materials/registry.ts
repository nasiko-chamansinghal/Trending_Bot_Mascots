import type { Material } from './types';

const MATERIALS: Record<string, Material> = {};

export function registerMaterial(name: string, material: Material): void {
  MATERIALS[name] = material;
}

export function getMaterial(name: string): Material | undefined {
  return MATERIALS[name];
}

export function listMaterials(): string[] {
  return Object.keys(MATERIALS);
}

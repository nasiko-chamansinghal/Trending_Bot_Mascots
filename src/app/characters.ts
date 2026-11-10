import { isCustomId } from './designer/design';
import { hasDesign } from './designer/store';
import type { DefLike, EmotionConfigApi, MascotEngine } from './engine-types';
import { EmotionBall, emotionBallConfig, MoodMates, moodMatesConfigFor } from './kits';

export interface CharacterInfo {
  id: string;
  name: string;
}

export interface MascotOptions {
  character: string;
  emotion: string;
  color?: string | null;
  eyeColor?: string | null;
  idle?: { standbyAfter: number; sleepAfter: number };
  label?: string;
  lite?: boolean;
  autostart?: boolean;
}

export const DEFAULT_EMOTION = '02';

/** Built-in characters first, then the custom designs saved in this browser. */
export function listCharacters(): CharacterInfo[] {
  return [
    { id: 'ball', name: 'Ball' },
    ...MoodMates.characters
      .list()
      .filter((c) => !isCustomId(c.id) || hasDesign(c.id))
      .map((c) => ({ id: c.id, name: c.name })),
  ];
}

export function characterName(id: string): string {
  return listCharacters().find((c) => c.id === id)?.name ?? id;
}

export function hasCharacter(id: string): boolean {
  return listCharacters().some((c) => c.id === id);
}

export function emotionsOf(character: string): DefLike[] {
  return configOf(character).list();
}

function configOf(character: string): EmotionConfigApi {
  return character === 'ball' ? emotionBallConfig : moodMatesConfigFor(character);
}

export function createMascot(el: HTMLElement, options: MascotOptions): MascotEngine {
  const { character, color, ...rest } = options;
  const themed = color ? { ...rest, color } : rest;
  return character === 'ball'
    ? EmotionBall.create(el, themed)
    : MoodMates.create(el, { ...themed, character });
}

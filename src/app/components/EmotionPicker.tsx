import { emotionsOf } from '../characters';
import { MascotThumb } from './MascotThumb';
import { Tile } from './Tile';

interface EmotionPickerProps {
  character: string;
  emotion: string;
  color: string | null;
  eyes: string | null;
  onSelect: (id: string) => void;
}

export function EmotionPicker({ character, emotion, color, eyes, onSelect }: EmotionPickerProps) {
  return (
    <div className="tile-grid" role="radiogroup" aria-label="Emotion">
      {emotionsOf(character).map((def, index) => (
        <Tile
          key={`${character}:${def.id}`}
          group="emotion"
          value={def.id}
          label={def.name}
          title={def.desc}
          index={index}
          checked={def.id === emotion}
          onSelect={() => onSelect(def.id)}
        >
          <MascotThumb character={character} emotion={def.id} color={color} eyes={eyes} label={def.name} />
        </Tile>
      ))}
    </div>
  );
}

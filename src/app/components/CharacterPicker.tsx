import { DEFAULT_EMOTION, listCharacters } from '../characters';
import { MascotThumb } from './MascotThumb';
import { Tile } from './Tile';

interface CharacterPickerProps {
  character: string;
  colors: Record<string, string | null>;
  eyes: Record<string, string | null>;
  onSelect: (id: string) => void;
}

export function CharacterPicker({ character, colors, eyes, onSelect }: CharacterPickerProps) {
  return (
    <div className="tile-grid" role="radiogroup" aria-label="Character">
      {listCharacters().map((c, index) => (
        <Tile
          key={c.id}
          group="character"
          value={c.id}
          label={c.name}
          index={index}
          checked={c.id === character}
          onSelect={() => onSelect(c.id)}
        >
          <MascotThumb
            character={c.id}
            emotion={DEFAULT_EMOTION}
            color={colors[c.id] ?? null}
            eyes={eyes[c.id] ?? null}
            label={c.name}
          />
        </Tile>
      ))}
    </div>
  );
}

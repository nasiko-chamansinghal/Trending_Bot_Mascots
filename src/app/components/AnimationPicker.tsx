import { type CSSProperties, useMemo } from 'react';
import { emotionsOf } from '../characters';
import { MascotThumb } from './MascotThumb';

interface AnimationPickerProps {
  character: string;
  active: string | null;
  color: string | null;
  eyes: string | null;
  positions: Map<string, number>;
  onAdd: (id: string) => void;
}

export function AnimationPicker({ character, active, color, eyes, positions, onAdd }: AnimationPickerProps) {
  const emotions = useMemo(() => emotionsOf(character), [character]);

  return (
    <div className="tile-grid">
      {emotions.map((def, index) => {
        const position = positions.get(def.id);
        return (
          <button
            key={`${character}:${def.id}`}
            type="button"
            className="tile"
            title={def.desc}
            aria-label={position ? `${def.name}, clip ${position} in the timeline` : `Add ${def.name}`}
            data-checked={def.id === active || undefined}
            style={{ '--i': index } as CSSProperties}
            onClick={() => onAdd(def.id)}
          >
            <span className="tile-art">
              <MascotThumb
                character={character}
                emotion={def.id}
                color={color}
                eyes={eyes}
                label={def.name}
              />
            </span>
            <span className="tile-label">{def.name}</span>
            {position ? <span className="tile-count">{position}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

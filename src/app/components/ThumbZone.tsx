import { memo, useEffect, useRef } from 'react';
import type { DefLike, MascotEngine } from '../engine-types';
import { Mascot } from './Mascot';

interface ThumbCellProps {
  def: DefLike;
  title: string;
  label: string;
  selected: boolean;
  sketch: boolean;
  create: (def: DefLike) => (el: HTMLElement) => MascotEngine;
  registerCell: (id: string, el: HTMLElement | null) => void;
  onSelect: (def: DefLike) => void;
}

const ThumbCell = memo(function ThumbCell({
  def,
  title,
  label,
  selected,
  sketch,
  create,
  registerCell,
  onSelect,
}: ThumbCellProps) {
  const engineRef = useRef<MascotEngine | null>(null);
  const cellRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef(sketch);
  sketchRef.current = sketch;
  const mounted = useRef(false);

  useEffect(() => {
    registerCell(def.id, cellRef.current);
    return () => registerCell(def.id, null);
  }, [def.id, registerCell]);

  useEffect(() => {
    if (mounted.current) engineRef.current?.setStyle({ sketch: sketch ? 1 : 0 });
    mounted.current = true;
  }, [sketch]);

  return (
    <div
      ref={cellRef}
      className={`cell${selected ? ' selected' : ''}`}
      title={title}
      onMouseEnter={() => {
        engineRef.current?.setActive(true);
        engineRef.current?.replay();
      }}
      onMouseLeave={() => {
        engineRef.current?.setActive(false);
        engineRef.current?.setEmotion(def.id, { auto: true });
      }}
      onClick={() => onSelect(def)}
    >
      <Mascot
        className="thumb"
        create={create(def)}
        engineRef={engineRef}
        onEngine={(engine) => {
          if (sketchRef.current) engine.setStyle({ sketch: 1 });
        }}
      />
      <div className="cell-label">
        <span className="cid">{def.id}</span>
        <span>{label}</span>
      </div>
    </div>
  );
});

interface ThumbZoneProps {
  defs: DefLike[];
  selectedId: string;
  sketch: boolean;
  isAlbum: boolean;
  engineKey: string;
  create: (def: DefLike) => (el: HTMLElement) => MascotEngine;
  titleOf: (def: DefLike) => string;
  labelOf: (def: DefLike) => string;
  registerCell: (id: string, el: HTMLElement | null) => void;
  onSelect: (def: DefLike) => void;
  zoneRef: React.RefObject<HTMLDivElement | null>;
}

export function ThumbZone({
  defs,
  selectedId,
  sketch,
  isAlbum,
  engineKey,
  create,
  titleOf,
  labelOf,
  registerCell,
  onSelect,
  zoneRef,
}: ThumbZoneProps) {
  const albumRef = useRef(isAlbum);
  albumRef.current = isAlbum;

  useEffect(() => {
    const zone = zoneRef.current as HTMLDivElement;
    let down = false;
    let dragging = false;
    let startX = 0;
    let startLeft = 0;
    let pid = 0;

    const onDown = (e: PointerEvent) => {
      if (!albumRef.current) return;
      down = true;
      dragging = false;
      startX = e.clientX;
      startLeft = zone.scrollLeft;
      pid = e.pointerId;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!dragging && Math.abs(dx) > 6) {
        dragging = true;
        zone.classList.add('dragging');
        try {
          zone.setPointerCapture(pid);
        } catch {
          dragging = true;
        }
      }
      if (dragging) zone.scrollLeft = startLeft - dx;
    };
    const end = () => {
      down = false;
      if (dragging) {
        dragging = false;
        zone.classList.remove('dragging');
      }
    };

    zone.addEventListener('pointerdown', onDown);
    zone.addEventListener('pointermove', onMove);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    return () => {
      zone.removeEventListener('pointerdown', onDown);
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerup', end);
      zone.removeEventListener('pointercancel', end);
    };
  }, [zoneRef]);

  return (
    <div className="thumb-zone" id="thumbZone" ref={zoneRef}>
      <div id="thumbFlow" className="thumb-flow">
        {defs.map((def) => (
          <ThumbCell
            key={`${engineKey}|${def.id}`}
            def={def}
            title={titleOf(def)}
            label={labelOf(def)}
            selected={def.id === selectedId}
            sketch={sketch}
            create={create}
            registerCell={registerCell}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

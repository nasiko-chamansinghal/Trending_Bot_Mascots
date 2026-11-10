import { type ChangeEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { DEFAULT_EMOTION, emotionsOf } from '../characters';
import { SAVED_COLORS } from '../colors';
import {
  autoGradient,
  type Design,
  fromTemplate,
  type NumericKey,
  newId,
  outlinePath,
  RANGES,
  SHAPE_LABELS,
  SHAPES,
  type ShapeKind,
  TEMPLATES,
} from '../designer/design';
import {
  type DesignState,
  deleteDesign,
  designFile,
  getDesignState,
  parseDesignFile,
  saveDesign,
  selectDesign,
} from '../designer/store';
import { download } from '../exportImage';
import { MediaExports } from './MediaExports';
import { Stage } from './Stage';
import { Tile } from './Tile';

const SAVE_DELAY_MS = 70;
const EYE_QUICK = [
  { hex: '#1D1A2E', name: 'Ink' },
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#3B2A1A', name: 'Cocoa' },
];

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'mascot'
  );
}

interface SilhouetteProps {
  design: Design;
}

function Silhouette({ design }: SilhouetteProps) {
  const id = useId();
  const d = useMemo(() => outlinePath(design), [design]);
  return (
    <svg className="silhouette" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={design.top} />
          <stop offset="0.5" stopColor={design.body} />
          <stop offset="1" stopColor={design.bottom} />
        </linearGradient>
      </defs>
      <path d={d} fill={`url(#${id})`} />
    </svg>
  );
}

interface SliderProps {
  label: string;
  field: NumericKey;
  design: Design;
  onChange: (patch: Partial<Design>) => void;
  format?: (value: number) => string;
}

function Slider({ label, field, design, onChange, format }: SliderProps) {
  const id = useId();
  const range = RANGES[field];
  const value = design[field];
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format ? format(value) : value.toFixed(2)}</output>
      </div>
      <input
        id={id}
        className="range"
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange({ [field]: Number(e.target.value) })}
      />
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="color-field">
      <input
        type="color"
        value={value.toLowerCase()}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
      />
      <span className="color-field-text">
        <span className="color-field-label">{label}</span>
        <span className="color-field-hex">{value}</span>
      </span>
    </label>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const times = (v: number) => `×${v.toFixed(2)}`;

interface DesignViewProps {
  state: DesignState;
  onUse: (id: string) => void;
}

export function DesignView({ state, onUse }: DesignViewProps) {
  const active = state.designs.find((d) => d.id === state.activeId) ?? null;
  const [draft, setDraft] = useState<Design | null>(active);
  const [emotion, setEmotion] = useState(DEFAULT_EMOTION);
  const [picking, setPicking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  if (active && draft?.id !== active.id) {
    setDraft(active);
    setConfirmDelete(false);
  } else if (!active && draft) {
    setDraft(null);
  }

  useEffect(() => {
    if (!draft) return;
    const stored = getDesignState().designs.find((d) => d.id === draft.id);
    if (stored === draft) return;
    const timer = setTimeout(() => {
      if (!saveDesign(draft)) setNote('That design could not be built. Try other values.');
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    if (!note) return;
    const timer = setTimeout(() => setNote(''), 3200);
    return () => clearTimeout(timer);
  }, [note]);

  const update = (patch: Partial<Design>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const create = (index: number) => {
    const n = state.designs.length + 1;
    const design = fromTemplate(index, `${TEMPLATES[index]?.name ?? 'Mascot'} ${n}`);
    if (!saveDesign(design)) {
      setNote('You have reached the limit of saved mascots. Delete one first.');
      return;
    }
    setPicking(false);
    setEmotion(DEFAULT_EMOTION);
  };

  const duplicate = () => {
    if (!draft) return;
    if (!saveDesign({ ...draft, id: newId(), name: `${draft.name} copy`.slice(0, 32) })) {
      setNote('You have reached the limit of saved mascots. Delete one first.');
    }
  };

  const remove = () => {
    if (!draft) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteDesign(draft.id);
    setConfirmDelete(false);
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const design = parseDesignFile(await file.text());
    if (!design || !saveDesign(design)) {
      setNote('That file is not a Mascot Studio design.');
      return;
    }
    setNote(`Imported ${design.name}`);
  };

  const importInput = (
    <input
      ref={fileRef}
      className="visually-hidden"
      type="file"
      accept=".json,application/json"
      tabIndex={-1}
      onChange={onImport}
    />
  );

  const templates = (
    <div className="tile-grid">
      {TEMPLATES.map((t, index) => (
        <button key={t.name} type="button" className="tile" onClick={() => create(index)}>
          <span className="tile-art">
            <Silhouette design={{ ...t, id: `template-${index}` }} />
          </span>
          <span className="tile-label">{t.name}</span>
        </button>
      ))}
    </div>
  );

  if (!draft) {
    return (
      <div className="design-empty">
        <div className="design-empty-card">
          <h1>Design your own mascot</h1>
          <p>
            Pick a starting shape, then sculpt the outline, colours and eyes. Your mascot gets every emotion
            the studio has, and it is saved in this browser, no account needed.
          </p>
          {templates}
          <div className="design-empty-actions">
            <button type="button" className="button-quiet" onClick={() => fileRef.current?.click()}>
              Import a design file
            </button>
            {importInput}
          </div>
          <p className="design-note" role="status">
            {note}
          </p>
        </div>
      </div>
    );
  }

  const emotions = emotionsOf(draft.id);
  const current = emotions.find((def) => def.id === emotion);
  const labels = SHAPE_LABELS[draft.shape];
  const revision = state.revisions[draft.id] ?? 0;

  return (
    <>
      <div className="stage-column">
        <div className="title-row">
          <h1>Design</h1>
          <p>
            {draft.name} · {current?.name ?? '—'} · saved in this browser
          </p>
        </div>
        <div className="design-stage">
          <Stage
            key={`${draft.id}:${revision}`}
            character={draft.id}
            emotion={emotion}
            emotionName={current?.name ?? emotion}
            exportName={draft.name}
            color={null}
            eyes={null}
            onEmotionChange={setEmotion}
          />
        </div>
        <div className="design-actions">
          <label className="select">
            <span className="visually-hidden">Preview emotion</span>
            <select value={emotion} onChange={(e) => setEmotion(e.target.value)}>
              {emotions.map((def) => (
                <option key={def.id} value={def.id}>
                  {def.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="button-quiet"
            onClick={() => {
              const pool = emotions.filter((def) => def.id !== emotion);
              const next = pool[Math.floor(Math.random() * pool.length)];
              if (next) setEmotion(next.id);
            }}
          >
            Random emotion
          </button>
          <span className="design-actions-gap" />
          <button type="button" className="button-quiet" onClick={() => onUse(draft.id)}>
            Use in Customise
          </button>
          <button
            type="button"
            className="button-quiet"
            onClick={() => download(designFile(draft), `${slug(draft.name)}.mascot.json`)}
          >
            Download design
          </button>
          <button type="button" className="button-quiet" onClick={() => fileRef.current?.click()}>
            Import
          </button>
          {importInput}
        </div>
        <MediaExports
          character={draft.id}
          name={draft.name}
          emotion={emotion}
          emotionName={current?.name ?? emotion}
          onNote={setNote}
        />
        <p className="design-note" role="status">
          {note}
        </p>
      </div>
      <aside className="inspector" aria-label="Design options">
        <section className="inspector-section">
          <div className="section-head">
            <h2>My mascots</h2>
            <button type="button" className="button-quiet" onClick={() => setPicking((p) => !p)}>
              {picking ? 'Cancel' : 'New'}
            </button>
          </div>
          {picking ? (
            templates
          ) : (
            <div className="tile-grid" role="radiogroup" aria-label="My mascots">
              {state.designs.map((d, index) => (
                <Tile
                  key={d.id}
                  group="design"
                  value={d.id}
                  label={d.id === draft.id ? draft.name : d.name}
                  index={index}
                  checked={d.id === draft.id}
                  onSelect={() => selectDesign(d.id)}
                >
                  <Silhouette design={d.id === draft.id ? draft : d} />
                </Tile>
              ))}
            </div>
          )}
          <div className="button-row">
            <button type="button" className="button-quiet" onClick={duplicate}>
              Duplicate
            </button>
            <button
              type="button"
              className="button-quiet"
              data-danger={confirmDelete || undefined}
              onClick={remove}
              onBlur={() => setConfirmDelete(false)}
            >
              {confirmDelete ? 'Click again to delete' : 'Delete'}
            </button>
          </div>
        </section>

        <section className="inspector-section">
          <div className="section-head">
            <h2>Name</h2>
          </div>
          <input
            className="text-input"
            type="text"
            maxLength={32}
            value={draft.name}
            aria-label="Mascot name"
            onChange={(e) => update({ name: e.target.value })}
            onBlur={() => {
              if (!draft.name.trim()) update({ name: 'Mascot' });
            }}
          />
        </section>

        <section className="inspector-section">
          <div className="section-head">
            <h2>Shape</h2>
            <span className="meta">{labels.name}</span>
          </div>
          <div className="tile-grid" role="radiogroup" aria-label="Shape">
            {SHAPES.map((shape: ShapeKind, index) => (
              <Tile
                key={shape}
                group="shape"
                value={shape}
                label={SHAPE_LABELS[shape].name}
                index={index}
                checked={shape === draft.shape}
                onSelect={() => update({ shape })}
              >
                <Silhouette design={{ ...draft, shape }} />
              </Tile>
            ))}
          </div>
        </section>

        <section className="inspector-section">
          <div className="section-head">
            <h2>Outline</h2>
            {draft.shape === 'blob' ? (
              <button
                type="button"
                className="button-quiet"
                onClick={() => update({ seed: Math.floor(Math.random() * RANGES.seed.max) })}
              >
                Shuffle
              </button>
            ) : null}
          </div>
          <div className="fields">
            {labels.sides ? (
              <Slider
                label={labels.sides}
                field="sides"
                design={draft}
                onChange={update}
                format={(v) => String(v)}
              />
            ) : null}
            <Slider label={labels.amount} field="amount" design={draft} onChange={update} format={pct} />
            <Slider label="Roundness" field="roundness" design={draft} onChange={update} format={pct} />
            <Slider label="Width" field="width" design={draft} onChange={update} format={times} />
            <Slider label="Height" field="height" design={draft} onChange={update} format={times} />
            <Slider label="Tilt" field="tilt" design={draft} onChange={update} format={(v) => `${v}°`} />
          </div>
        </section>

        <section className="inspector-section">
          <div className="section-head">
            <h2>Body</h2>
          </div>
          <div className="fields">
            <Slider label="Size" field="size" design={draft} onChange={update} format={(v) => String(v)} />
            <Slider label="Thickness" field="thickness" design={draft} onChange={update} format={pct} />
            <Slider label="Puffiness" field="puff" design={draft} onChange={update} />
          </div>
        </section>

        <section className="inspector-section">
          <div className="section-head">
            <h2>Colour</h2>
            <button
              type="button"
              className="button-quiet"
              onClick={() => update(autoGradient(draft.body))}
              title="Rebuild the top and bottom colours from the body colour"
            >
              Auto gradient
            </button>
          </div>
          <div className="swatch-grid">
            {SAVED_COLORS.map((c) => (
              <label key={c.hex} className="swatch" title={c.name}>
                <input
                  className="visually-hidden"
                  type="radio"
                  name="design-colour"
                  value={c.hex}
                  checked={c.hex === draft.body}
                  onChange={() => update({ body: c.hex, ...autoGradient(c.hex) })}
                  aria-label={c.name}
                />
                <span className="swatch-fill" style={{ backgroundColor: c.hex }} />
              </label>
            ))}
          </div>
          <div className="color-fields">
            <ColorField
              label="Body"
              value={draft.body}
              onChange={(hex) => update({ body: hex, ...autoGradient(hex) })}
            />
            <ColorField label="Top" value={draft.top} onChange={(hex) => update({ top: hex })} />
            <ColorField label="Bottom" value={draft.bottom} onChange={(hex) => update({ bottom: hex })} />
          </div>
        </section>

        <section className="inspector-section">
          <div className="section-head">
            <h2>Eyes</h2>
          </div>
          <div className="color-fields">
            <ColorField label="Colour" value={draft.eyeColor} onChange={(hex) => update({ eyeColor: hex })} />
            <div className="eye-quick">
              {EYE_QUICK.map((e) => (
                <button
                  key={e.hex}
                  type="button"
                  className="eye-dot"
                  title={e.name}
                  aria-label={`${e.name} eyes`}
                  aria-pressed={draft.eyeColor === e.hex}
                  style={{ backgroundColor: e.hex }}
                  onClick={() => update({ eyeColor: e.hex })}
                />
              ))}
            </div>
          </div>
          <div className="fields">
            <Slider label="Left / right" field="eyeX" design={draft} onChange={update} format={pct} />
            <Slider label="Up / down" field="eyeY" design={draft} onChange={update} format={pct} />
            <Slider
              label="Spacing"
              field="eyeGap"
              design={draft}
              onChange={update}
              format={(v) => v.toFixed(1)}
            />
            <Slider label="Size" field="eyeSize" design={draft} onChange={update} format={times} />
            <Slider label="Tall / wide" field="eyeShape" design={draft} onChange={update} format={times} />
          </div>
        </section>
      </aside>
    </>
  );
}

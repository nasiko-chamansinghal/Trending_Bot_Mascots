import { useMemo, useRef, useState } from 'react';
import {
  type BodyDescriptor,
  buildBody,
  buildEyePair,
  buildMouth,
  type EyeStyle,
  eyeSlots,
  mouthSlots,
  type Ring,
} from '../../engine/mood-mates/geometry';

interface SliderDef {
  min: number;
  max: number;
  step: number;
  v: number;
}

type Schema = Record<string, SliderDef>;

const BODY_SCHEMAS: Record<string, Schema> = {
  cloud: {
    r: { min: 0.5, max: 1.1, step: 0.01, v: 0.94 },
    lobes: { min: 3, max: 12, step: 1, v: 7 },
    amp: { min: 0, max: 0.2, step: 0.005, v: 0.08 },
    flat: { min: 0, max: 0.3, step: 0.01, v: 0.12 },
  },
  star: {
    r: { min: 0.6, max: 1.15, step: 0.01, v: 1.02 },
    points: { min: 3, max: 8, step: 1, v: 5 },
    inner: { min: 0.4, max: 0.95, step: 0.01, v: 0.74 },
    sharp: { min: 0, max: 1, step: 0.05, v: 0.5 },
  },
};

const EYE_SCHEMA: Schema = {
  dx: { min: 14, max: 46, step: 1, v: 30 },
  cy: { min: 80, max: 120, step: 1, v: 102 },
  w: { min: 12, max: 40, step: 0.5, v: 25 },
  h: { min: 14, max: 48, step: 0.5, v: 33 },
  taper: { min: 0.2, max: 1.2, step: 0.02, v: 0.42 },
  tilt: { min: -15, max: 15, step: 0.5, v: 0 },
  bend: { min: -0.3, max: 0.5, step: 0.01, v: 0.02 },
};

type Tab = 'body' | 'eye' | 'mouth';

function ringPath(ring: Ring): string {
  let s = 'M';
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i] as [number, number];
    s += `${i ? 'L' : ''}${p[0].toFixed(2)} ${p[1].toFixed(2)}`;
  }
  return `${s}Z`;
}

function defaults(schema: Schema): Record<string, number> {
  return Object.fromEntries(Object.entries(schema).map(([k, d]) => [k, d.v]));
}

function describe(value: object): string {
  return JSON.stringify(value)
    .replace(/"([a-z]+)":/gi, ' $1: ')
    .replace(/,/g, ', ');
}

function Slider({
  name,
  def,
  value,
  onChange,
}: {
  name: string;
  def: SliderDef;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="field">
      <label>
        <span>{name}</span>
        <b>{value}</b>
      </label>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
      />
    </div>
  );
}

function CopyButton({ text, label, ghost }: { text: () => string; label: string; ghost?: boolean }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  return (
    <button
      type="button"
      className={`act${ghost ? ' ghost' : ''}`}
      onClick={() => {
        navigator.clipboard.writeText(text()).then(() => {
          setCopied(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

function BodyTab({ hidden }: { hidden: boolean }) {
  const [type, setType] = useState('cloud');
  const [values, setValues] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(Object.entries(BODY_SCHEMAS).map(([t, s]) => [t, defaults(s)])),
  );
  const schema = BODY_SCHEMAS[type] as Schema;
  const current = values[type] as Record<string, number>;
  const descriptor = { type, ...current } as BodyDescriptor;
  const ring = useMemo(() => buildBody(descriptor), [descriptor]);
  const out = `body: ${describe(descriptor).replace('{', '{')}`;

  return (
    <div className={`layout${hidden ? ' hidden' : ''}`} id="tab-body">
      <div className="panel">
        <h2>Generator parameters</h2>
        <div className="field">
          <label>Generator type</label>
          <select id="bodyType" value={type} onChange={(e) => setType(e.target.value)}>
            {Object.keys(BODY_SCHEMAS).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div id="bodyParams">
          {Object.entries(schema).map(([k, def]) => (
            <Slider
              key={`${type}-${k}`}
              name={k}
              def={def}
              value={current[k] as number}
              onChange={(v) => setValues({ ...values, [type]: { ...current, [k]: v } })}
            />
          ))}
        </div>
      </div>
      <div className="preview">
        <svg id="bodySvg" viewBox="0 0 240 240" width="360" height="360">
          <path id="bodyPath" fill="#8AD6C8" stroke="#5aa89c" strokeWidth="1" d={ringPath(ring)} />
        </svg>
        <textarea className="out" id="bodyOut" readOnly value={out} />
        <div className="btn-row">
          <CopyButton text={() => out} label="Copy descriptor" />
          <CopyButton text={() => JSON.stringify(ring)} label="Copy baked 96-point ring" ghost />
        </div>
      </div>
    </div>
  );
}

function EyeTab({ hidden }: { hidden: boolean }) {
  const [state, setState] = useState(() => defaults(EYE_SCHEMA));
  const style = state as unknown as EyeStyle;
  const out = `eyeStyle: ${describe(state)}\n// Optionally add highlight: { dx: 4, dy: -7, r: 3 } for a highlight dot`;
  return (
    <div className={`layout${hidden ? ' hidden' : ''}`} id="tab-eye">
      <div className="panel">
        <h2>eyeStyle parameters</h2>
        <div id="eyeParams">
          {Object.entries(EYE_SCHEMA).map(([k, def]) => (
            <Slider
              key={k}
              name={k}
              def={def}
              value={state[k] as number}
              onChange={(v) => setState({ ...state, [k]: v })}
            />
          ))}
        </div>
      </div>
      <div className="preview">
        <div className="slot-grid" id="eyeGrid">
          {eyeSlots.map((slot) => {
            const pair = buildEyePair(slot, style);
            return (
              <div className="slot-cell" key={slot}>
                <svg viewBox="50 60 140 90">
                  <path d={ringPath(pair[0])} fill="#e8e8f0" />
                  <path d={ringPath(pair[1])} fill="#e8e8f0" />
                </svg>
                <span>{slot}</span>
              </div>
            );
          })}
        </div>
        <textarea className="out" id="eyeOut" readOnly value={out} />
        <div className="btn-row">
          <CopyButton text={() => out} label="Copy eyeStyle" />
        </div>
      </div>
    </div>
  );
}

function MouthTab({ hidden }: { hidden: boolean }) {
  const [w, setW] = useState(26);
  return (
    <div className={`layout${hidden ? ' hidden' : ''}`} id="tab-mouth">
      <div className="panel">
        <h2>Mouth base</h2>
        <div className="field">
          <label>
            <span>Mouth width w</span>
            <b id="mouthWv">{w}</b>
          </label>
          <input
            type="range"
            id="mouthW"
            min="14"
            max="44"
            step="1"
            value={w}
            onChange={(e) => setW(Number.parseFloat(e.target.value))}
          />
        </div>
        <p className="sub" style={{ marginTop: 8 }}>
          Slot height and curvature are semantic constants; characters only tune w.
        </p>
      </div>
      <div className="preview">
        <div className="slot-grid" id="mouthGrid">
          {mouthSlots.map((slot) => (
            <div className="slot-cell" key={slot}>
              <svg viewBox="-30 -22 60 44">
                <path d={ringPath(buildMouth(slot, { w }))} fill="#e8e8f0" />
              </svg>
              <span>{slot}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'body', label: 'Body' },
  { key: 'eye', label: 'Eyes' },
  { key: 'mouth', label: 'Mouth' },
];

export function RingEditorPage() {
  const [tab, setTab] = useState<Tab>('body');
  return (
    <>
      <h1>Ring Editor</h1>
      <p className="sub">
        Generate the body ring (96 points) and the eye ring family (48-point lens topology) from parameters.
        Once tuned, export the descriptor and paste it into src/engine/mood-mates/characters/*.ts; also record
        the generation parameters in docs/DESIGN-PROVENANCE.md as original-work evidence.
      </p>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tab${tab === t.key ? ' active' : ''}`}
            data-tab={t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <BodyTab hidden={tab !== 'body'} />
      <EyeTab hidden={tab !== 'eye'} />
      <MouthTab hidden={tab !== 'mouth'} />
    </>
  );
}

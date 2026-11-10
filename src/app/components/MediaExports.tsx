import { useState } from 'react';
import { download } from '../download';
import { BACKDROPS, type Backdrop, renderGif, renderSheet } from '../mediaExport';

const LENGTHS = [2, 4, 6];
const SIZES = [
  { px: 240, name: 'Small' },
  { px: 360, name: 'Medium' },
  { px: 480, name: 'Large' },
];

type Job = { kind: 'gif' | 'sheet'; done: number } | null;

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'mascot'
  );
}

interface MediaExportsProps {
  character: string;
  name: string;
  emotion: string;
  emotionName: string;
  onNote: (text: string) => void;
}

export function MediaExports({ character, name, emotion, emotionName, onNote }: MediaExportsProps) {
  const [backdrop, setBackdrop] = useState<Backdrop>('white');
  const [seconds, setSeconds] = useState(4);
  const [size, setSize] = useState(360);
  const [job, setJob] = useState<Job>(null);

  const run = async (kind: 'gif' | 'sheet') => {
    if (job) return;
    setJob({ kind, done: 0 });
    const onProgress = (done: number) => setJob({ kind, done });
    try {
      if (kind === 'gif') {
        const blob = await renderGif({
          character,
          timeline: [{ emotion, ms: seconds * 1000 }],
          size,
          backdrop,
          onProgress,
        });
        download(blob, `mascot-${slug(name)}-${slug(emotionName)}.gif`);
        onNote(`Saved a ${seconds}s GIF of ${emotionName} (${Math.round(blob.size / 1024)} KB)`);
      } else {
        const blob = await renderSheet({ character, name, backdrop, onProgress });
        download(blob, `mascot-${slug(name)}-emotions.png`);
        onNote('Saved the emotion sheet');
      }
    } catch (e) {
      console.error(e);
      onNote(kind === 'gif' ? 'The GIF could not be made.' : 'The emotion sheet could not be made.');
    } finally {
      setJob(null);
    }
  };

  const label = (kind: 'gif' | 'sheet', idle: string) =>
    job?.kind === kind
      ? `${kind === 'gif' ? 'Recording' : 'Rendering'} ${Math.round(job.done * 100)}%`
      : idle;

  return (
    <div className="design-actions media-exports" aria-busy={job ? true : undefined}>
      <label className="select">
        <span className="select-label">Background</span>
        <select value={backdrop} disabled={!!job} onChange={(e) => setBackdrop(e.target.value as Backdrop)}>
          {BACKDROPS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      <label className="select">
        <span className="select-label">GIF</span>
        <select value={seconds} disabled={!!job} onChange={(e) => setSeconds(Number(e.target.value))}>
          {LENGTHS.map((s) => (
            <option key={s} value={s}>
              {s} seconds
            </option>
          ))}
        </select>
      </label>
      <label className="select">
        <span className="visually-hidden">GIF size</span>
        <select value={size} disabled={!!job} onChange={(e) => setSize(Number(e.target.value))}>
          {SIZES.map((s) => (
            <option key={s.px} value={s.px}>
              {s.name} · {s.px}px
            </option>
          ))}
        </select>
      </label>
      <span className="design-actions-gap" />
      <button type="button" className="button-quiet" disabled={!!job} onClick={() => run('sheet')}>
        {label('sheet', 'Emotion sheet')}
      </button>
      <button type="button" className="button-quiet" disabled={!!job} onClick={() => run('gif')}>
        {label('gif', 'Animated GIF')}
      </button>
    </div>
  );
}

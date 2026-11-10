import { type ReactNode, useEffect, useRef, useState } from 'react';
import { download } from '../download';
import { embedCode } from '../embed';
import { type Look, renderVideo, type Segment, themeBackdrop, VideoUnsupportedError } from '../videoExport';

type Status = 'idle' | 'recording' | 'saved' | 'copied';

const RESET_MS = 1800;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const VIDEO_ICON = (
  <>
    <rect x="3.5" y="5" width="17" height="14" rx="3.5" />
    <path d="m10.25 9.25 4.5 2.75-4.5 2.75z" />
  </>
);
const CODE_ICON = <path d="m8.5 8-4.5 4 4.5 4m7-8 4.5 4-4.5 4M13.5 6l-3 12" />;
const CHECK_ICON = <path d="m5 12.5 4.5 4.5L19 7.5" />;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    Object.assign(area.style, { position: 'fixed', opacity: '0' });
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    return copied;
  }
}

interface ExportActionsProps {
  look: Look;
  timeline: Segment[];
  baseName: string;
}

export function ExportActions({ look, timeline, baseName }: ExportActionsProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const empty = timeline.length === 0;
  const recording = status === 'recording';
  const seconds = Math.round(timeline.reduce((sum, s) => sum + s.ms, 0) / 1000);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const settle = (next: Status) => {
    setStatus(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus('idle'), RESET_MS);
  };

  const record = async () => {
    setError('');
    setProgress(0);
    setStatus('recording');
    try {
      const blob = await renderVideo({
        ...look,
        timeline,
        backdrop: themeBackdrop(),
        onProgress: setProgress,
      });
      download(blob, `${baseName}.mp4`);
      settle('saved');
    } catch (e) {
      console.error(e);
      setStatus('idle');
      setError(
        e instanceof VideoUnsupportedError
          ? 'This browser cannot record video. Try Chrome, Edge or Safari, or copy the embed code instead.'
          : 'The video could not be made. Please try again.',
      );
    }
  };

  const copy = async () => {
    setError('');
    if (await copyText(embedCode(look, timeline))) settle('copied');
    else setError('Copying was blocked. Allow clipboard access and try again.');
  };

  return (
    <div className="export" aria-busy={recording || undefined}>
      <div className="export-row">
        <button
          type="button"
          className="export-button"
          data-kind="primary"
          disabled={empty || recording}
          onClick={record}
        >
          <Icon>{status === 'saved' ? CHECK_ICON : VIDEO_ICON}</Icon>
          {recording
            ? `Recording ${Math.round(progress * 100)}%`
            : status === 'saved'
              ? 'Saved'
              : 'Download video'}
        </button>
        <button
          type="button"
          className="export-button"
          data-kind="secondary"
          disabled={empty || recording}
          onClick={copy}
        >
          <Icon>{status === 'copied' ? CHECK_ICON : CODE_ICON}</Icon>
          {status === 'copied' ? 'Copied' : 'Copy embed code'}
        </button>
      </div>
      <p className="export-note" role="status" data-error={error ? '' : undefined}>
        {error ||
          (empty
            ? 'Add a clip to export it.'
            : `MP4 video, ${seconds} s, ${timeline.length === 1 ? 'of this emotion' : `${timeline.length} emotions in order`}. Or paste the embed code on any website.`)}
      </p>
    </div>
  );
}

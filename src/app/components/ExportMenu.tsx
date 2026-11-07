import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { canCopyImage, copyPng, copySvg, download, renderPng, renderSvg } from '../exportImage';

type ActionId = 'png' | 'svg' | 'copy-png' | 'copy-svg';
type Status = 'idle' | 'busy' | 'saved' | 'copied' | 'failed';

interface Action {
  id: ActionId;
  label: string;
  detail: string;
  group: 'download' | 'copy';
}

const ACTIONS: Action[] = [
  { id: 'png', label: 'Download PNG', detail: '1024 × 1024, transparent', group: 'download' },
  { id: 'svg', label: 'Download SVG', detail: 'Vector, sharp at any size', group: 'download' },
  { id: 'copy-png', label: 'Copy image', detail: 'PNG to the clipboard', group: 'copy' },
  { id: 'copy-svg', label: 'Copy SVG code', detail: 'Markup to the clipboard', group: 'copy' },
];

const STATUS_LABEL: Record<Status, string> = {
  idle: 'Export as PNG',
  busy: 'Exporting',
  saved: 'Saved',
  copied: 'Copied',
  failed: 'Export failed',
};

const RESET_MS = 1800;

interface IconProps {
  children: ReactNode;
  size?: number;
}

function Icon({ children, size = 18 }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
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

const ICONS: Record<ActionId | 'saved', ReactNode> = {
  png: <path d="M12 4v11m0 0-4-4.2M12 15l4-4.2M4 19.5h16" />,
  svg: <path d="m8.5 8-4.5 4 4.5 4m7-8 4.5 4-4.5 4M13.5 6l-3 12" />,
  'copy-png': (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="3" />
      <path d="M15.5 8.5V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v5.5a3 3 0 0 0 3 3h1.5" />
    </>
  ),
  'copy-svg': (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="3" />
      <path d="M15.5 8.5V7a3 3 0 0 0-3-3H7a3 3 0 0 0-3 3v5.5a3 3 0 0 0 3 3h1.5" />
    </>
  ),
  saved: <path d="m5 12.5 4.5 4.5L19 7.5" />,
};

interface ExportMenuProps {
  getSvg: () => SVGSVGElement | null;
  baseName: string;
}

export function ExportMenu({ getSvg, baseName }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const rootRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const menuId = useId();
  const actions = ACTIONS.filter((a) => a.id !== 'copy-png' || canCopyImage());
  const busy = status === 'busy';

  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    rootRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const settle = (next: Status) => {
    setStatus(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus('idle'), RESET_MS);
  };

  const run = async (id: ActionId) => {
    const svg = getSvg();
    setOpen(false);
    if (!svg) return;
    setStatus('busy');
    try {
      if (id === 'png') {
        download(await renderPng(svg), `${baseName}.png`);
        settle('saved');
      } else if (id === 'svg') {
        download(renderSvg(svg), `${baseName}.svg`);
        settle('saved');
      } else if (id === 'copy-png') {
        await copyPng(svg);
        settle('copied');
      } else {
        await copySvg(svg);
        settle('copied');
      }
    } catch {
      settle('failed');
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')];
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const move = (to: number) => {
      event.preventDefault();
      items[(to + items.length) % items.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(index + 1);
    else if (event.key === 'ArrowUp') move(index - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(items.length - 1);
    else if (event.key === 'Tab') setOpen(false);
  };

  const onRootKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      moreRef.current?.focus();
    }
  };

  const confirmed = status === 'saved' || status === 'copied';

  return (
    <div className="export" ref={rootRef} onKeyDown={onRootKeyDown}>
      <div className="split">
        <button type="button" className="split-main" onClick={() => run('png')} disabled={busy}>
          <Icon size={18}>{confirmed ? ICONS.saved : ICONS.png}</Icon>
          {STATUS_LABEL[status]}
        </button>
        <span className="split-rule" aria-hidden="true" />
        <button
          ref={moreRef}
          type="button"
          className="split-more"
          aria-label="More export options"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
          disabled={busy}
        >
          <Icon size={16}>
            <path d="m6 9.5 6 5.5 6-5.5" />
          </Icon>
        </button>
      </div>
      <div
        id={menuId}
        className="menu"
        role="menu"
        aria-label="Export options"
        data-open={open || undefined}
        inert={!open}
        onKeyDown={onMenuKeyDown}
      >
        {actions.map((action, index) => (
          <div key={action.id} className="menu-entry">
            {index > 0 && actions[index - 1]?.group !== action.group ? <hr className="menu-sep" /> : null}
            <button type="button" role="menuitem" className="menu-item" onClick={() => run(action.id)}>
              <span className="menu-icon">
                <Icon>{ICONS[action.id]}</Icon>
              </span>
              <span className="menu-text">
                <span className="menu-label">{action.label}</span>
                <span className="menu-detail">{action.detail}</span>
              </span>
            </button>
          </div>
        ))}
      </div>
      <p className="export-note" role="status">
        {status === 'failed' ? 'Export failed. Try again.' : ''}
      </p>
    </div>
  );
}

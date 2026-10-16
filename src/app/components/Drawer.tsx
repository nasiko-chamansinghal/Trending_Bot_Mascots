import type { ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  maskHidden: boolean;
  maskShow: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Drawer({ open, maskHidden, maskShow, onClose, children }: DrawerProps) {
  return (
    <>
      <div
        id="drawerMask"
        className={`drawer-mask${maskShow ? ' show' : ''}`}
        hidden={maskHidden}
        onClick={onClose}
      />
      <aside id="drawer" className={`drawer${open ? ' open' : ''}`} aria-hidden={!open}>
        <div className="drawer-head">
          <h2>Settings</h2>
          <button
            type="button"
            id="drawerClose"
            className="icon-btn"
            aria-label="Close settings"
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </aside>
    </>
  );
}

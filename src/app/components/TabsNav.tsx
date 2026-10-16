import type { GroupLike } from '../engine-types';

interface TabsNavProps {
  tabs: GroupLike[];
  counts: Record<string, number>;
  current: string;
  onSelect: (key: string) => void;
}

export function TabsNav({ tabs, counts, current, onSelect }: TabsNavProps) {
  return (
    <nav id="tabs" className="tabs">
      {tabs.map((g) => (
        <button
          key={g.key}
          type="button"
          className={`tab${g.key === current ? ' active' : ''}`}
          data-key={g.key}
          onClick={() => onSelect(g.key)}
        >
          <span>{g.name}</span>
          <span className="tab-count">{counts[g.key]}</span>
        </button>
      ))}
    </nav>
  );
}

export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      id="settingsToggle"
      className="icon-btn settings-btn"
      aria-label="Settings"
      title="Settings"
      onClick={onClick}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
      </svg>
    </button>
  );
}

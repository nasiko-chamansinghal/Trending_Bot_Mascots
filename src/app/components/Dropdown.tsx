import { useEffect, useRef } from 'react';
import { closeDropdown, registerDropdownHost, toggleDropdown, useDropdownOpen } from '../dropdowns';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  id: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export function Dropdown({ id, value, options, onChange, ariaLabel }: DropdownProps) {
  const open = useDropdownOpen(id);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerDropdownHost(id, hostRef.current);
    return () => registerDropdownHost(id, null);
  }, [id]);

  const current = options.find((o) => o.value === value);

  return (
    <div className={`dd${open ? ' open' : ''}`} ref={hostRef}>
      <select
        id={id}
        className="select"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="dd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => toggleDropdown(id)}
      >
        {current ? current.label : ''}
      </button>
      <div className="dd-pop" role="listbox">
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              className={`dd-item${selected ? ' selected' : ''}`}
              role="option"
              aria-selected={selected}
              onClick={() => {
                closeDropdown(id);
                if (value !== o.value) onChange(o.value);
              }}
            >
              <span>{o.label}</span>
              <svg className="dd-check" viewBox="0 0 24 24" width="14" height="14">
                <path
                  d="M20 6L9 17l-5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}

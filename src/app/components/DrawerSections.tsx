import type { ReactNode } from 'react';
import type { useDrawerTools } from '../useDrawerTools';
import { Dropdown, type DropdownOption } from './Dropdown';
import { Toggle } from './Toggle';

type Tools = ReturnType<typeof useDrawerTools>;

interface DrawerSectionsProps {
  appearance: ReactNode;
  tourOn: boolean;
  onTourToggle: (checked: boolean) => void;
  intervalValue: string;
  intervalOptions: DropdownOption[];
  onTourInterval: (value: string) => void;
  tools: Tools;
}

export function SketchField({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="field">
      <label htmlFor="sketchToggle">Sketch mode</label>
      <label className="switch">
        <Toggle id="sketchToggle" checked={checked} onChange={onChange} />
      </label>
    </div>
  );
}

export function DrawerSections({
  appearance,
  tourOn,
  onTourToggle,
  intervalValue,
  intervalOptions,
  onTourInterval,
  tools,
}: DrawerSectionsProps) {
  return (
    <>
      <section className="drawer-sec">
        <h3>Appearance</h3>
        {appearance}
      </section>

      <section className="drawer-sec">
        <h3>Showcase</h3>
        <div className="field">
          <label htmlFor="tourToggle">Autoplay</label>
          <label className="switch">
            <Toggle id="tourToggle" checked={tourOn} onChange={onTourToggle} />
          </label>
        </div>
        <div className="field">
          <label htmlFor="tourInterval">Interval</label>
          <Dropdown
            id="tourInterval"
            value={intervalValue}
            options={intervalOptions}
            onChange={onTourInterval}
          />
        </div>
      </section>

      <section className="drawer-sec">
        <h3>AI simulation</h3>
        <input
          id="aiInput"
          className="ai-input"
          type="text"
          spellCheck={false}
          value={tools.aiText}
          onChange={(e) => tools.setAiText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') tools.sendAI(tools.aiText);
          }}
        />
        <div className="btn-row">
          <button
            type="button"
            id="aiSend"
            className="btn primary"
            onClick={() => tools.sendAI(tools.aiText)}
          >
            Send
          </button>
          <button type="button" id="aiSampleErr" className="btn ghost" onClick={tools.sampleErr}>
            Sample: error
          </button>
          <button type="button" id="aiSampleBad" className="btn ghost" onClick={tools.sampleBad}>
            Sample: unknown ID
          </button>
        </div>
      </section>

      <section className="drawer-sec">
        <h3>Config</h3>
        <div className="btn-row">
          <button type="button" id="btnExport" className="btn" onClick={tools.exportConfig}>
            Export
          </button>
          <button type="button" id="btnImport" className="btn" onClick={() => tools.fileRef.current?.click()}>
            Import
          </button>
        </div>
        <input
          type="file"
          id="importFile"
          accept=".json,application/json"
          hidden
          ref={tools.fileRef}
          onChange={tools.onImportFile}
        />
      </section>
    </>
  );
}

import { type ChangeEvent as ReactChangeEvent, useCallback, useRef, useState } from 'react';
import { closeAllDropdowns } from './dropdowns';
import type { EmotionConfigApi, MascotEngine } from './engine-types';

export function useDrawer() {
  const [open, setOpen] = useState(false);
  const [maskHidden, setMaskHidden] = useState(true);
  const [maskShow, setMaskShow] = useState(false);
  const openRef = useRef(false);

  const openDrawer = useCallback(() => {
    openRef.current = true;
    setOpen(true);
    setMaskHidden(false);
    requestAnimationFrame(() => setMaskShow(true));
  }, []);

  const closeDrawer = useCallback(() => {
    closeAllDropdowns();
    openRef.current = false;
    setOpen(false);
    setMaskShow(false);
    setTimeout(() => setMaskHidden(true), 300);
  }, []);

  const closeIfOpen = useCallback(() => {
    if (!openRef.current) return false;
    closeDrawer();
    return true;
  }, [closeDrawer]);

  return { open, maskHidden, maskShow, openDrawer, closeDrawer, closeIfOpen };
}

interface DrawerToolsOptions {
  mainRef: { current: MascotEngine | null };
  lastErrorAt: { current: number };
  stopTourUI: () => void;
  openStage: () => void;
  toast: (text: string, kind?: string) => void;
  importApplied: () => void;
  config: EmotionConfigApi;
  filename: string;
}

export function useDrawerTools({
  mainRef,
  lastErrorAt,
  stopTourUI,
  openStage,
  toast,
  importApplied,
  config,
  filename,
}: DrawerToolsOptions) {
  const [aiText, setAiText] = useState('{"emotionId":"30","tips":"Thinking about the user\'s question"}');
  const fileRef = useRef<HTMLInputElement>(null);

  const sendAI = useCallback(
    (value: string) => {
      const raw = value.trim();
      const main = mainRef.current;
      if (!raw || !main) return;
      if (main.touring) stopTourUI();
      const before = performance.now();
      const ok = main.handleAIMessage(raw);
      if (ok) openStage();
      if (ok && lastErrorAt.current < before) toast(`AI message dispatched: ${raw}`, 'ok');
    },
    [lastErrorAt, mainRef, openStage, stopTourUI, toast],
  );

  const sendSample = useCallback(
    (text: string) => {
      setAiText(text);
      sendAI(text);
    },
    [sendAI],
  );

  const sampleErr = useCallback(
    () => sendSample('{"emotionId":"34","tips":"API call failed, check the network"}'),
    [sendSample],
  );
  const sampleBad = useCallback(
    () => sendSample('{"emotionId":"99","tips":"an emotion id that does not exist"}'),
    [sendSample],
  );

  const exportConfig = useCallback(() => {
    const blob = new Blob([config.exportConfig()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Exported ${config.list().length} emotion configs`, 'ok');
  }, [config, filename, toast]);

  const onImportFile = useCallback(
    (e: ReactChangeEvent<HTMLInputElement>) => {
      const input = e.target;
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const res = config.importConfig(String(reader.result));
        importApplied();
        if (res.ok) toast(`Imported ${res.added} emotion configs`, 'ok');
        else toast(`Imported ${res.added}, failed: ${res.errors.join('; ')}`, 'danger');
      };
      reader.readAsText(file);
      input.value = '';
    },
    [config, importApplied, toast],
  );

  return { aiText, setAiText, sendAI, sampleErr, sampleBad, exportConfig, fileRef, onImportFile };
}

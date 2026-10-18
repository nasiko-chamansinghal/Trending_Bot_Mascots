import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { closeAllDropdowns, installDropdownDismiss } from './dropdowns';
import type { ChangeEvent, DefLike, EmotionConfigApi, GroupLike, MascotEngine } from './engine-types';
import { installGazeListeners, refreshGazeRects } from './gaze';
import { useTimed } from './timed';

export interface CorePrefs {
  theme: 'dark' | 'light';
  mode: 'wall' | 'album';
  sketch: boolean;
  tourMs: number;
}

interface CoreOptions<P extends CorePrefs> {
  config: EmotionConfigApi;
  prefs: P;
  prefsRef: { current: P };
  updatePrefs: (patch: Partial<P>) => P;
  debugHandle: string;
  onEscape?: () => boolean;
}

function listDefs(config: EmotionConfigApi, tab: string, _version: number): DefLike[] {
  return config.list(tab === 'all' ? null : tab);
}

function listTabs(config: EmotionConfigApi, _version: number): GroupLike[] {
  return [{ key: 'all', name: 'All' }, ...config.groups().filter((g) => config.list(g.key).length > 0)];
}

export interface ToastPayload {
  text: string;
  kind: string;
}

export function useGalleryCore<P extends CorePrefs>({
  config,
  prefs,
  prefsRef,
  updatePrefs,
  debugHandle,
  onEscape,
}: CoreOptions<P>) {
  const [selectedId, setSelectedId] = useState('02');
  const [metaDef, setMetaDef] = useState<DefLike | null>(null);
  const [currentTab, setCurrentTabState] = useState('all');
  const [configVersion, setConfigVersion] = useState(0);
  const [tourOn, setTourOn] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [toastState, showToast] = useTimed<ToastPayload>(3600);
  const [tips, showTips] = useTimed<string>(3200);

  const mainRef = useRef<MascotEngine | null>(null);
  const cells = useRef(new Map<string, HTMLElement>());
  const thumbZoneRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef('02');
  const tabRef = useRef('all');
  const stageOpenRef = useRef(false);
  const lastErrorAt = useRef(-1);
  const configRef = useRef(config);
  const onEscapeRef = useRef(onEscape);
  configRef.current = config;
  onEscapeRef.current = onEscape;

  useLayoutEffect(() => {
    if (!config.def(selectedRef.current)) {
      selectedRef.current = '02';
      setSelectedId('02');
      setMetaDef(null);
    }
  }, [config]);

  const toast = useCallback((text: string, kind = '') => showToast({ text, kind }), [showToast]);

  const currentDefs = useCallback(
    () => configRef.current.list(tabRef.current === 'all' ? null : tabRef.current),
    [],
  );

  const defs = useMemo(
    () => listDefs(config, currentTab, configVersion),
    [config, currentTab, configVersion],
  );

  const tabs: GroupLike[] = useMemo(() => listTabs(config, configVersion), [config, configVersion]);

  const tabName = useCallback((key: string) => {
    const found = [{ key: 'all', name: 'All' }, ...configRef.current.groups()].find((g) => g.key === key);
    return found ? found.name : key;
  }, []);

  const registerCell = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cells.current.set(id, el);
    else cells.current.delete(id);
  }, []);

  const centerSelected = useCallback(() => {
    const cell = cells.current.get(selectedRef.current);
    const zone = thumbZoneRef.current;
    if (!cell || !zone) return;
    const zr = zone.getBoundingClientRect();
    const cr = cell.getBoundingClientRect();
    if (document.body.classList.contains('mode-album')) {
      zone.scrollTo({
        left: zone.scrollLeft + (cr.left + cr.width / 2) - (zr.left + zr.width / 2),
        behavior: 'smooth',
      });
    } else {
      const nextTop = zone.scrollTop + (cr.top + cr.height / 2) - (zr.top + zr.height / 2);
      if (cr.top < zr.top || cr.bottom > zr.bottom) {
        zone.scrollTo({ top: nextTop, behavior: 'smooth' });
      }
    }
  }, []);

  const openStage = useCallback(() => {
    if (prefsRef.current.mode !== 'wall' || stageOpenRef.current) return;
    stageOpenRef.current = true;
    setStageOpen(true);
    refreshGazeRects();
  }, [prefsRef]);

  const closeStage = useCallback(() => {
    if (!stageOpenRef.current) return;
    stageOpenRef.current = false;
    setStageOpen(false);
    refreshGazeRects();
  }, []);

  const restartTour = useCallback(() => {
    const ids = currentDefs().map((d) => d.id);
    mainRef.current?.startTour(ids, prefsRef.current.tourMs);
  }, [currentDefs, prefsRef]);

  const stopTourUI = useCallback(() => {
    mainRef.current?.stopTour();
    setTourOn(false);
  }, []);

  const selectedIndex = useCallback(() => {
    const list = currentDefs();
    for (let i = 0; i < list.length; i++) if ((list[i] as DefLike).id === selectedRef.current) return i;
    return -1;
  }, [currentDefs]);

  const step = useCallback(
    (delta: number) => {
      const list = currentDefs();
      const main = mainRef.current;
      if (!list.length || !main) return;
      if (main.touring) stopTourUI();
      const idx = selectedIndex();
      const next = idx < 0 ? (delta > 0 ? 0 : list.length - 1) : (idx + delta + list.length) % list.length;
      main.setEmotion((list[next] as DefLike).id);
      openStage();
    },
    [currentDefs, openStage, selectedIndex, stopTourUI],
  );

  const selectCell = useCallback(
    (def: DefLike) => {
      const main = mainRef.current;
      if (!main) return;
      if (main.touring) stopTourUI();
      main.setEmotion(def.id);
      openStage();
    },
    [openStage, stopTourUI],
  );

  const setTab = useCallback(
    (key: string) => {
      if (tabRef.current === key) return;
      tabRef.current = key;
      setCurrentTabState(key);
      setMetaDef(null);
      if (mainRef.current?.touring) restartTour();
    },
    [restartTour],
  );

  const setMode = useCallback(
    (mode: 'wall' | 'album') => {
      updatePrefs({ mode } as Partial<P>);
      stageOpenRef.current = false;
      setStageOpen(false);
      refreshGazeRects();
      requestAnimationFrame(centerSelected);
    },
    [centerSelected, updatePrefs],
  );

  const toggleTheme = useCallback(() => {
    const theme = prefsRef.current.theme === 'dark' ? 'light' : 'dark';
    updatePrefs({ theme } as Partial<P>);
    toast(theme === 'dark' ? 'Dark mode on' : 'Light mode on');
  }, [prefsRef, toast, updatePrefs]);

  const onTourToggle = useCallback(
    (checked: boolean) => {
      setTourOn(checked);
      if (checked) {
        restartTour();
        openStage();
        toast(`Autoplay on: ${currentDefs().length} emotions in "${tabName(tabRef.current)}"`, 'ok');
      } else {
        mainRef.current?.stopTour();
        toast('Autoplay off');
      }
    },
    [currentDefs, openStage, restartTour, tabName, toast],
  );

  const onTourInterval = useCallback(
    (value: string) => {
      updatePrefs({ tourMs: Number.parseInt(value, 10) || 2500 } as Partial<P>);
      if (mainRef.current?.touring) restartTour();
    },
    [restartTour, updatePrefs],
  );

  const onSketch = useCallback(
    (checked: boolean) => {
      updatePrefs({ sketch: checked } as Partial<P>);
      mainRef.current?.setStyle({ sketch: checked ? 1 : 0 });
      toast(checked ? 'Sketch mode on (outline only)' : 'Back to solid fill', checked ? 'ok' : '');
    },
    [toast, updatePrefs],
  );

  const attachMain = useCallback(
    (engine: MascotEngine) => {
      engine.setStyle({ sketch: prefsRef.current.sketch ? 1 : 0 });
      engine.on('change', (e: ChangeEvent) => {
        selectedRef.current = e.id;
        setSelectedId(e.id);
        setMetaDef(e.def);
        centerSelected();
      });
      engine.on('tips', (e) => showTips(e.text));
      engine.on('error', (e) => {
        lastErrorAt.current = performance.now();
        toast(e.message, 'danger');
      });
      (window as unknown as Record<string, unknown>)[debugHandle] = engine;
    },
    [centerSelected, debugHandle, prefsRef, showTips, toast],
  );

  const onStageClick = useCallback(() => {
    const main = mainRef.current;
    if (!main) return;
    if (main.celebrate) main.celebrate(1);
    else if (!main.signature?.(1)) main.spin(1);
  }, []);

  const importApplied = useCallback(() => {
    setConfigVersion((v) => v + 1);
    setMetaDef(null);
  }, []);

  const resetMeta = useCallback(() => setMetaDef(null), []);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', prefs.theme);
  }, [prefs.theme]);

  useLayoutEffect(() => {
    document.body.classList.toggle('mode-wall', prefs.mode === 'wall');
    document.body.classList.toggle('mode-album', prefs.mode === 'album');
    document.body.classList.toggle('stage-open', stageOpen);
  }, [prefs.mode, stageOpen]);

  useEffect(() => {
    requestAnimationFrame(centerSelected);
  }, [centerSelected]);

  useEffect(() => {
    const removeGaze = installGazeListeners();
    const removeDropdown = installDropdownDismiss();
    return () => {
      removeGaze();
      removeDropdown();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        step(-1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        step(1);
        e.preventDefault();
      } else if (e.key === 'Escape') {
        if (closeAllDropdowns()) return;
        if (onEscapeRef.current?.()) return;
        closeStage();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [step, closeStage]);

  useEffect(() => {
    const reset = () => mainRef.current?.resetIdle();
    document.addEventListener('pointerdown', reset, { passive: true });
    document.addEventListener('keydown', reset, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', reset);
      document.removeEventListener('keydown', reset);
    };
  }, []);

  const shownDef = metaDef ?? config.def(selectedId);
  const idx = defs.findIndex((d) => d.id === selectedId);
  const pager = `${idx >= 0 ? String(idx + 1).padStart(2, '0') : '--'} / ${String(defs.length).padStart(2, '0')}`;

  return {
    mainRef,
    thumbZoneRef,
    selectedRef,
    selectedId,
    currentTab,
    defs,
    tabs,
    tourOn,
    toastState,
    tips,
    lastErrorAt,
    shownDef,
    pager,
    toast,
    registerCell,
    openStage,
    closeStage,
    step,
    selectCell,
    setTab,
    setMode,
    toggleTheme,
    onTourToggle,
    onTourInterval,
    onSketch,
    attachMain,
    onStageClick,
    stopTourUI,
    importApplied,
    resetMeta,
    configVersion,
  };
}

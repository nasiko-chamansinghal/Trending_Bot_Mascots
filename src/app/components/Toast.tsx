import type { TimedState } from '../timed';
import type { ToastPayload } from '../useGalleryCore';

export function Toast({ state }: { state: TimedState<ToastPayload> }) {
  const kind = state.visible && state.value?.kind ? ` ${state.value.kind}` : '';
  return (
    <div id="toast" className={`toast${state.visible ? ' show' : ''}${kind}`} role="status">
      {state.value?.text}
    </div>
  );
}

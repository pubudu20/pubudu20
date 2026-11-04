/**
 * A tiny "data changed" signal. The home-screen widget runs in the same app
 * process, so when it ticks a habit it fires this and the open app reloads.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onDataChanged(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitDataChanged() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn(e);
    }
  });
}

/** All browser callbacks belong to one mounted game, including pending frame waits. */
export function createScope() {
  const listeners = [],
    frames = new Map(),
    timers = new Set(),
    intervals = new Set();
  let disposed = false;
  function frame(callback, onCancel) {
    if (disposed) {
      onCancel?.();
      return;
    }
    const id = requestAnimationFrame((time) => {
      frames.delete(id);
      if (!disposed) callback(time);
    });
    frames.set(id, onCancel);
    return id;
  }
  return {
    frame,
    nextFrame: () => new Promise((resolve) => frame(resolve, resolve)),
    listen(target, event, callback, options) {
      if (disposed) return;
      target.addEventListener(event, callback, options);
      listeners.push(() =>
        target.removeEventListener(event, callback, options),
      );
    },
    timeout(callback, delay) {
      if (disposed) return;
      const id = setTimeout(() => {
        timers.delete(id);
        if (!disposed) callback();
      }, delay);
      timers.add(id);
      return id;
    },
    interval(callback, delay) {
      if (disposed) return;
      const id = setInterval(() => {
        if (!disposed) callback();
      }, delay);
      intervals.add(id);
      return id;
    },
    dispose() {
      disposed = true;
      listeners.splice(0).forEach((remove) => remove());
      for (const [id, resolve] of frames) {
        cancelAnimationFrame(id);
        resolve?.();
      }
      frames.clear();
      timers.forEach(clearTimeout);
      timers.clear();
      intervals.forEach(clearInterval);
      intervals.clear();
    },
  };
}

import assert from 'node:assert/strict';
import test from 'node:test';

let nextFrameId = 0;
const frames = new Map();

globalThis.requestAnimationFrame = (callback) => {
  const id = ++nextFrameId;
  frames.set(id, callback);
  return id;
};

globalThis.cancelAnimationFrame = (id) => frames.delete(id);

const { clock$, paused$ } = await import('./clock.ts');

function renderFrame(timestamp) {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach((callback) => callback(timestamp));
}

test('clock emits milliseconds since the previous animation frame', () => {
  const ticks = [];
  const subscription = clock$.subscribe((tick) => ticks.push(tick));

  renderFrame(100);
  renderFrame(116);
  renderFrame(146);
  subscription.unsubscribe();

  assert.deepEqual(ticks, [16, 30]);
});

test('clock emits no deltas while paused', () => {
  paused$.next(false);
  const ticks = [];
  const subscription = clock$.subscribe((tick) => ticks.push(tick));

  try {
    renderFrame(200);
    renderFrame(216);
    paused$.next(true);
    renderFrame(232);
    renderFrame(248);
    paused$.next(false);
    renderFrame(264);

    assert.deepEqual(ticks, [16, 16]);
  } finally {
    subscription.unsubscribe();
    paused$.next(false);
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { enableAudioOnFirstInteraction } from '../src/audio/audio-context.ts';

test('enables audio once on the first pointer or keyboard interaction', async () => {
  const interactionTarget = new EventTarget();
  const originalDocument = globalThis.document;
  let finishResume;
  let resumeCalls = 0;
  const resumed = new Promise((resolve) => {
    finishResume = resolve;
  });

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: interactionTarget,
  });

  try {
    enableAudioOnFirstInteraction({
      resume() {
        resumeCalls += 1;
        return resumed;
      },
    });

    interactionTarget.dispatchEvent(new Event('pointerdown'));
    interactionTarget.dispatchEvent(new Event('keydown'));
    assert.equal(resumeCalls, 1);

    finishResume();
    await resumed;
    await Promise.resolve();

    interactionTarget.dispatchEvent(new Event('pointerdown'));
    interactionTarget.dispatchEvent(new Event('keydown'));
    assert.equal(resumeCalls, 1);
  } finally {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    });
  }
});

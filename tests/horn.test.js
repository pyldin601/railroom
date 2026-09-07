import test from 'node:test';
import assert from 'node:assert/strict';
import { hornBuffer, hornDistanceGain } from '../src/audio/horn.js';
test('horn becomes quieter as the listener moves away from the locomotive', () => {
  assert.ok(hornDistanceGain(117.484) < 0.2);
  assert.ok(hornDistanceGain(10.7) > hornDistanceGain(117.484));
  assert.ok(hornDistanceGain(200) < hornDistanceGain(117.484));
});
test('horn has an audible decaying tail after the blast and retains headroom', () => {
  const context = {
    sampleRate: 24000,
    createBuffer(channels, length, rate) {
      const data = new Float32Array(length);
      return { duration: length / rate, getChannelData: () => data };
    },
  };
  const buffer = hornBuffer(context),
    data = buffer.getChannelData(0);
  const energy = (a, b) => data.slice(a * 24000, b * 24000).reduce((s, x) => s + x * x, 0);
  assert.ok(buffer.duration >= 4);
  assert.ok(energy(1.3, 1.5) > 1e-5);
  assert.ok(energy(2.3, 2.5) > 1e-5, 'ambient tail remains audible beyond two seconds');
  assert.ok(energy(3.7, 3.9) < energy(2.3, 2.5) * 0.01, 'long tail fades naturally');
  assert.ok(data.every((x) => Number.isFinite(x) && Math.abs(x) < 1));
  assert.equal(hornBuffer(context), buffer);
});

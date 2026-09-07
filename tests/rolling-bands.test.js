import test from 'node:test';
import assert from 'node:assert/strict';
import {
  splitRolling,
  updateRollingBands,
  disposeRollingBands,
} from '../src/audio/rolling-bands.js';
test('rolling bands have complementary filters, independent gains and complete cleanup', () => {
  const nodes = [];
  const node = () => {
    const n = {
      frequency: { value: 0 },
      Q: { value: 0 },
      gain: {
        value: 1,
        setTargetAtTime(v) {
          this.value = v;
        },
      },
      connect() {
        return this;
      },
      disconnect() {
        this.disconnected = true;
      },
    };
    nodes.push(n);
    return n;
  };
  const bands = splitRolling(
    { createBiquadFilter: node, createGain: node },
    { connect: (n) => n },
    {},
  );
  for (const [name, type] of [
    ['rollingLow', 'lowpass'],
    ['rollingHigh', 'highpass'],
  ]) {
    assert.equal(bands[name].filters.length, 2);
    for (const f of bands[name].filters) {
      assert.equal(f.type, type);
      assert.equal(f.frequency.value, 500);
      assert.equal(f.Q.value, 20 * Math.log10(Math.SQRT1_2));
    }
  }
  updateRollingBands(bands, { rollingLow: 0, rollingHigh: 0.7 }, 0);
  assert.equal(bands.rollingLow.gain.gain.value, 0);
  assert.equal(bands.rollingHigh.gain.gain.value, 0.7);
  disposeRollingBands(bands);
  assert.ok(nodes.every((n) => n.disconnected));
});

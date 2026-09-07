import test from 'node:test';
import assert from 'node:assert/strict';
import { rollingWheels } from '../src/audio/rolling.js';
import { impactDistance } from '../src/audio/impact-distance.js';
import { wheelsets } from '../src/route/route-index.js';
test('rolling uses eight distinct wheel feeds only in the occupied carriage', () => {
  const feeds = rollingWheels(wheelsets(10), 5);
  assert.equal(feeds.length, 8);
  assert.ok(feeds.every((f) => f.axle.car === 5));
  assert.equal(new Set(feeds.map((f) => `${f.axle.id}:${f.side}`)).size, 8);
  assert.equal(new Set(feeds.map((f) => f.offset)).size, 8);
  assert.equal(new Set(feeds.map((f) => f.rate)).size, 8);
  assert.ok(
    feeds.every((f) => f.rate >= 0.99 && f.rate <= 1.01),
    'wheel pitch stays within ±1%',
  );
  const cents = feeds.map((f) => 1200 * Math.log2(f.rate));
  assert.ok(cents.every((c) => Math.abs(c) <= 17.1));
  assert.ok(Math.max(...cents) - Math.min(...cents) >= 30, 'wheel pitches retain a small spread');
  assert.ok(
    Math.abs(cents.reduce((sum, c) => sum + c, 0)) < 1e-8,
    'keep the average pitch centred',
  );
  assert.equal(rollingWheels(wheelsets(1), 1).length, 8);
});

test('rolling pitch stays fixed from low speed through maximum speed', async () => {
  const { RollingLayers } = await import('../src/audio/rolling.js');
  const parameter = () => ({
    value: 1,
    setTargetAtTime(v) {
      this.value = v;
    },
  });
  const node = () => ({
    frequency: parameter(),
    Q: parameter(),
    gain: parameter(),
    playbackRate: parameter(),
    connect() {
      return this;
    },
    start() {},
  });
  const context = {
    currentTime: 0,
    createGain: node,
    createBufferSource: node,
    createBiquadFilter: node,
  };
  const axles = wheelsets(1),
    mixer = {
      axles,
      occupied: 1,
      motorMode: 'recorded',
      levels: { rolling: 1 },
      emitters: new Map(
        axles.flatMap((a) =>
          ['left', 'right'].map((side) => [`${a.id}:${side}`, { gain: node() }]),
        ),
      ),
    };
  const bank = {
    pool: (kind) => (kind === 'rolling' ? [{ buffer: { duration: 9.85 }, gain: 1 }] : []),
  };
  const rolling = new RollingLayers(context, bank, mixer);
  rolling.start();
  const rates = rolling.layers.map((l) => l.source.playbackRate.value);
  assert.deepEqual(
    rates,
    rollingWheels(axles, 1).map((w) => w.rate),
  );
  for (const speed of [0, 1, 10, 20, 33.333]) {
    rolling.update({ speed }, {}, true);
    assert.deepEqual(
      rolling.layers.map((l) => l.source.playbackRate.value),
      rates,
    );
  }
  for (const seat of [2, 9.7, 17.4]) {
    mixer.seat = seat;
    rolling.update({ speed: 22 }, {}, true);
    for (const layer of rolling.layers) {
      const axle = axles.find((a) => a.id === layer.wheelsetId);
      const expected = (0.28 / Math.sqrt(2)) * impactDistance(axle, seat, 1, layer.side).metal;
      assert.ok(
        Math.abs(layer.gain.gain.value - expected) < 1e-10,
        'rolling follows each wheel’s metal distance gain after seat changes',
      );
    }
  }
});

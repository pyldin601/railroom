import test from 'node:test';
import assert from 'node:assert/strict';
import { initialAir, advanceAir } from '../src/simulation/pneumatics.js';
import { initialState, advanceMotion, stateInSegment } from '../src/simulation/motion.js';
test('cylinders fill from reservoir, hold without hissing and exhaust on release', () => {
  const applied = advanceAir(initialAir(), { brake: 1 }, 1);
  assert.equal(applied.cylinder, 2.5);
  assert.ok(applied.reservoir < 8.5);
  assert.equal(applied.releaseFlow, 0);
  const full = advanceAir(applied, { brake: 1 }, 1),
    held = advanceAir(full, { brake: 1 }, 0.1);
  assert.equal(held.cylinder, 4);
  assert.equal(held.releaseFlow, 0);
  const released = advanceAir(held, { brake: 0 }, 0.1);
  assert.ok(released.cylinder < 4);
  assert.ok(released.releaseFlow > 0);
});
test('compressor starts low, stops high and cannot run in neutral section', () => {
  assert.equal(advanceAir({ ...initialAir(), reservoir: 7 }, {}, 0.1).compressor, true);
  assert.equal(
    advanceAir({ ...initialAir(), reservoir: 9, compressor: true }, {}, 0.1).compressor,
    false,
  );
  assert.equal(
    advanceAir({ ...initialAir(), reservoir: 7, compressor: true }, {}, 0.1, false).compressor,
    false,
  );
});
test('pressure interpolates on transport time; service-brake demand blocks traction during filling', () => {
  const { segments, state } = advanceMotion(initialState(), { throttle: 1, brake: 1 }, 0.01);
  assert.equal(state.speed, 0);
  assert.ok(stateInSegment(segments[0], 0.005).air.cylinder < state.air.cylinder);
});
test('release lasts several seconds and exhaust flow tapers with pressure', () => {
  let air = { ...initialAir(), cylinder: 4 },
    previous = Infinity;
  for (let i = 0; i < 60; i++) {
    air = advanceAir(air, {}, 0.1);
    assert.ok(air.releaseFlow <= previous + 1e-10);
    previous = air.releaseFlow;
    if (i === 19) assert.ok(air.cylinder > 0.8, 'retain pressure after two seconds');
  }
  assert.ok(air.cylinder < 0.06 && air.cylinder > 0);
  assert.ok(air.releaseFlow < 0.05);
  for (let i = 0; i < 60; i++) air = advanceAir(air, {}, 0.1);
  assert.equal(air.cylinder, 0);
  assert.equal(air.releaseFlow, 0);
});

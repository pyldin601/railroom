import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteIndex } from '../src/route/route-index.js';
import { advanceMotion } from '../src/simulation/motion.js';
import { Transport } from '../src/audio/scheduler.js';
const route = new RouteIndex({
  length: 100,
  operatingMarkers: [
    { id: 'off', position: 10, type: 'power_off' },
    { id: 'on', position: 20, type: 'power_on' },
  ],
});
const options = { powerAt: (p) => route.powerAt(p), nextPower: (p) => route.nextPower(p) };
test('traction cuts at boundary with no residual positive acceleration and resumes after it', () => {
  const result = advanceMotion(
    { position: 9.99, speed: 10, acceleration: 0.5, time: 0 },
    { throttle: 1 },
    1.2,
    options,
  );
  const inside = result.segments.filter(
    (s) => s.start.position >= 10 && s.start.position < 20 - 1e-8,
  );
  assert.ok(inside.length > 0);
  assert.ok(inside.every((s) => s.acceleration <= 0));
  assert.ok(result.state.acceleration > 0);
});
test('seeking inside a neutral section disables traction but retains braking', () => {
  assert.equal(route.powerAt(15), false);
  assert.equal(route.powerAt(20), true);
  const s = { position: 15, speed: 1, acceleration: 0.5, time: 0 };
  assert.ok(advanceMotion(s, { throttle: 1 }, 0.1, options).state.speed <= 1);
  assert.ok(advanceMotion(s, { emergency: true }, 0.1, options).state.speed < 1);
});
test('each power boundary schedules exactly one switch sound across scheduler ticks', () => {
  let now = 0;
  const hits = [];
  const sink = { power: (e, t) => hits.push([e.kind, t]), hit() {}, silence() {}, cancelFrom() {} };
  const t = new Transport({
    clock: () => now,
    sink,
    route,
    axles: [],
    vehicle: { resistance: 0, drag: 0 },
  });
  t.seek(9);
  t.state.speed = 10;
  t.start();
  for (let i = 1; i < 55; i++) {
    now = i * 0.025;
    t.tick();
  }
  assert.deepEqual(
    hits.map((h) => h[0]),
    ['power_off', 'power_on'],
  );
  assert.ok(Math.abs(hits[0][1] - 0.16) < 1e-6);
});

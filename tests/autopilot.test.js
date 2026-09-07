import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Autopilot } from '../src/simulation/autopilot.js';
import { advanceMotion, initialState } from '../src/simulation/motion.js';
import { RouteIndex } from '../src/route/route-index.js';
test('autopilot completes all stops with minute dwells, mild braking and anticipates limits', () => {
  const route = new RouteIndex(
    JSON.parse(fs.readFileSync(new URL('../public/route.json', import.meta.url))),
  );
  let state = initialState(),
    pilot = new Autopilot(route, state, 261),
    arrivals = [],
    lastIndex = 0,
    pilotPreviousArrival = 0,
    maxOverspeed = 0,
    maxArrivalSpeed = 0;
  for (let i = 0; i < 180000 && pilot.index < pilot.stops.length; i++) {
    const controls = pilot.update(state);
    assert.ok(controls.brake <= 0.4);
    assert.equal(controls.emergency, false);
    if (pilot.index !== lastIndex) {
      assert.ok(state.time - pilotPreviousArrival >= 60 - 1e-6);
      lastIndex = pilot.index;
    }
    if (pilot.arrivedAt !== null && arrivals.length === pilot.index) {
      arrivals.push(state.position);
      pilotPreviousArrival = pilot.arrivedAt;
    }
    const next = advanceMotion(state, controls, 0.1, {
      length: controls.stopPosition,
      powerAt: (p) => route.powerAt(p),
      nextPower: (p) => route.nextPower(p),
    });
    if (next.state.position === controls.stopPosition && state.position < controls.stopPosition)
      maxArrivalSpeed = Math.max(maxArrivalSpeed, state.speed);
    state = next.state;
    const limit =
      route.speedMarkers.find((m) => state.position >= m.position && state.position < m.endPosition)
        ?.speedKmh / 3.6;
    if (limit) maxOverspeed = Math.max(maxOverspeed, state.speed - limit);
  }
  assert.equal(pilot.index, 18);
  assert.equal(arrivals.length, 18);
  assert.ok(maxArrivalSpeed < 0.2, `arrival ${maxArrivalSpeed}`);
  assert.ok(maxOverspeed < 0.15, `overspeed ${maxOverspeed}`);
});
test('autopilot cuts throttle in neutral section', () => {
  const route = { stations: [{ name: 'End', position: 1000 }], powerAt: () => false };
  assert.equal(
    new Autopilot(route, initialState()).update({ ...initialState(), speed: 5 }).throttle,
    0,
  );
});

test('transport autopilot dwells on simulation time and manual takeover clears stop target', async () => {
  const { Transport } = await import('../src/audio/scheduler.js');
  let clock = 0;
  const route = new RouteIndex({
    length: 100,
    stations: [
      { name: 'A', position: 5 },
      { name: 'B', position: 100 },
    ],
  });
  const t = new Transport({
    clock: () => clock,
    sink: { hit() {}, silence() {}, cancelFrom() {} },
    route,
    axles: [],
  });
  t.setAutopilot(true);
  t.start();
  for (let i = 0; i < 5000 && t.autopilot.arrivedAt === null; i++) {
    clock += 0.025;
    t.tick();
  }
  assert.notEqual(t.autopilot.arrivedAt, null);
  t.pause();
  const time = t.snapshot().time;
  clock += 120;
  t.start();
  assert.ok(t.snapshot().time - time < 1);
  assert.equal(t.autopilot.index, 0);
  t.setAutopilot(false);
  assert.equal(t.autopilot, null);
  assert.equal(t.controls.stopPosition, undefined);
});
test('autopilot horns once before initial and station departures, never at the terminus', () => {
  const route = {
    stations: [
      { name: 'A', position: 100 },
      { name: 'B', position: 200 },
    ],
  };
  const pilot = new Autopilot(route, initialState());
  let c = pilot.update(initialState());
  assert.equal(c.horn, true);
  assert.equal(c.throttle, 0);
  c = pilot.update({ ...initialState(), time: 0.5 });
  assert.ok(!c.horn);
  assert.equal(c.throttle, 0);
  c = pilot.update({ ...initialState(), time: 1.5 });
  assert.ok(c.throttle > 0);
  pilot.update({ ...initialState(100), time: 10 });
  c = pilot.update({ ...initialState(100), time: 70 });
  assert.equal(c.horn, true);
  assert.equal(c.throttle, 0);
  c = pilot.update({ ...initialState(100), time: 71.5 });
  assert.ok(c.throttle > 0);
  assert.ok(!c.horn);
  pilot.update({ ...initialState(200), time: 100 });
  c = pilot.update({ ...initialState(200), time: 160 });
  assert.ok(!c.horn);
  assert.equal(c.throttle, 0);
  const moving = new Autopilot(route, { ...initialState(), speed: 10 });
  assert.ok(!moving.update({ ...initialState(), speed: 10 }).horn);
});

test('autopilot uses the same vehicle forces as motion for comfortable acceleration and braking', () => {
  const vehicle = {
    maxSpeed: 40,
    traction: 1.2,
    tractionFade: 0.25,
    resistance: 0.02,
    drag: 0.0002,
    serviceBrake: 1.6,
    jerk: Infinity,
  };
  const route = new RouteIndex({ length: 10000, stations: [{ name: 'End', position: 10000 }] });
  const accelerating = { ...initialState(), speed: 10 };
  const pilot = new Autopilot(route, accelerating, 0, vehicle);
  const acceleration = advanceMotion(accelerating, pilot.update(accelerating), 0.01, vehicle).state
    .acceleration;
  assert.ok(Math.abs(acceleration - 0.28) < 1e-9, `comfort acceleration was ${acceleration}`);

  const braking = { ...initialState(9900), speed: 25 };
  const deceleration = advanceMotion(braking, pilot.update(braking), 2, vehicle).state.acceleration;
  assert.ok(deceleration >= -0.33, `comfort deceleration was ${deceleration}`);
  assert.ok(deceleration < -0.3);
});

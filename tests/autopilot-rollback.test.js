import test from 'node:test';
import assert from 'node:assert/strict';
import { Transport } from '../src/audio/scheduler.js';
import { RouteIndex } from '../src/route/route-index.js';

function journey(stations = [{ name: 'End', position: 100 }]) {
  let now = 0;
  let queued = [];
  const heard = [];
  const sink = {
    hit() {},
    horn(when) {
      queued.push(when);
    },
    cancelFrom(when) {
      queued = queued.filter((time) => time < when);
    },
    silence() {
      queued = [];
    },
  };
  const transport = new Transport({
    clock: () => now,
    sink,
    route: new RouteIndex({ length: 100, stations }),
    axles: [],
  });
  function advance(seconds = 0.025) {
    now += seconds;
    heard.push(...queued.filter((time) => time <= now));
    queued = queued.filter((time) => time > now);
    transport.tick();
  }
  transport.setAutopilot(true);
  transport.start();
  return { transport, heard, advance, clock: () => now };
}

test('pause before the initial predicted horn reschedules one departure horn on resume', () => {
  const { transport, heard, advance } = journey();
  advance(0.03);
  transport.pause();
  advance(10);
  transport.start();
  for (let i = 0; i < 100; i++) advance();
  assert.equal(heard.length, 1);
  assert.ok(transport.controls.throttle > 0);
});

test('replanning before a predicted horn preserves exactly one departure', () => {
  const { transport, heard, advance } = journey();
  transport.updateControls({});
  for (let i = 0; i < 100; i++) advance();
  assert.equal(heard.length, 1);
});

test('pause and replanning after a horn has sounded do not replay it', () => {
  const { transport, heard, advance } = journey();
  for (let i = 0; i < 4; i++) advance();
  assert.equal(heard.length, 1);
  transport.updateControls({});
  transport.pause();
  advance(10);
  transport.start();
  for (let i = 0; i < 100; i++) advance();
  assert.equal(heard.length, 1);
});

test('a departure horn at the control cutoff survives without duplication', () => {
  const { transport, heard, advance } = journey();
  advance(0.035);
  transport.updateControls({});
  for (let i = 0; i < 100; i++) advance();
  assert.equal(heard.length, 1);
  assert.ok(Math.abs(heard[0] - 0.06) < 1e-9);
});

test('pause before a predicted arrival does not start the dwell early', () => {
  const { transport, advance } = journey([
    { name: 'Intermediate', position: 5 },
    { name: 'End', position: 100 },
  ]);
  for (let i = 0; i < 5000 && transport.autopilot.arrivedAt === null; i++) advance();
  assert.notEqual(transport.autopilot.arrivedAt, null);
  assert.ok(transport.snapshot().time < transport.autopilot.arrivedAt);
  transport.pause();
  assert.equal(transport.autopilot.arrivedAt, null);
  assert.ok(transport.state.position < 5);
  advance(120);
  transport.start();
  for (let i = 0; i < 100 && transport.autopilot.arrivedAt === null; i++) advance();
  assert.notEqual(transport.autopilot.arrivedAt, null);
  assert.equal(transport.autopilot.index, 0);
});

for (const action of ['pause', 'replan']) {
  test(`${action} during a predicted dwell transition preserves the stop and its departure horn`, () => {
    const { transport, heard, advance, clock } = journey([
      { name: 'Intermediate', position: 5 },
      { name: 'End', position: 100 },
    ]);
    let arrival;
    for (let i = 0; i < 10000 && transport.autopilot.index === 0; i++) {
      advance();
      if (transport.autopilot.arrivedAt !== null) arrival = transport.autopilot.arrivedAt;
    }
    assert.equal(transport.autopilot.index, 1, 'reach the first predicted departure');
    assert.ok(clock() - transport.origin < transport.autopilot.departureAt);
    assert.equal(heard.length, 1, 'the second horn is still scheduled in the future');
    if (action === 'pause') {
      transport.pause();
      assert.equal(transport.autopilot.index, 0, 'the unfinished dwell must remain current');
      advance(120);
      transport.start();
    } else {
      transport.updateControls({});
    }
    for (let i = 0; i < 100; i++) advance();
    assert.equal(heard.length, 2, 'one horn for each departure');
    assert.ok(
      heard[1] - transport.origin >= arrival + 60 - 1e-8,
      'the full simulation-time dwell is preserved',
    );
    assert.equal(transport.autopilot.index, 1);
  });
}

test('transport passes its vehicle configuration to the autopilot', () => {
  const transport = new Transport({
    clock: () => 0,
    sink: { hit() {}, silence() {}, cancelFrom() {} },
    route: new RouteIndex({ length: 10000, stations: [{ name: 'End', position: 10000 }] }),
    axles: [],
    vehicle: {
      traction: 1.2,
      tractionFade: 0.25,
      resistance: 0.02,
      drag: 0.0002,
      maxSpeed: 40,
      jerk: Infinity,
    },
  });
  transport.state.speed = 10;
  transport.setAutopilot(true);
  transport.start();
  assert.ok(Math.abs(transport.segments[0].acceleration - 0.28) < 1e-9);
});

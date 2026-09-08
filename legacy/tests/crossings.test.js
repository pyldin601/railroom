import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceMotion, initialState, DEFAULT_VEHICLE } from '../src/simulation/motion.js';
import { findCrossings } from '../src/simulation/crossings.js';
import { RouteIndex, demoRoute, wheelsets } from '../src/route/route-index.js';
const config = { ...DEFAULT_VEHICLE, resistance: 0, drag: 0, jerk: Infinity };
const route = new RouteIndex({
  length: 1000,
  stations: [],
  events: [
    { id: 'l', position: 100, side: 'left', type: 'joint' },
    { id: 'r', position: 100, side: 'right', type: 'joint' },
  ],
});
test('two wheelsets cross each rail at 5 and 5.125 seconds', () => {
  const { segments } = advanceMotion({ ...initialState(), speed: 20 }, {}, 6, config);
  const e = findCrossings(
    segments,
    [
      { id: 'a', offset: 0 },
      { id: 'b', offset: 2.5 },
    ],
    route,
  );
  assert.equal(e.length, 4);
  assert.ok(Math.abs(e[0].simulationTime - 5) < 1e-7);
  assert.ok(Math.abs(e[2].simulationTime - 5.125) < 1e-7);
});
test('split intervals neither miss nor duplicate boundary impacts', () => {
  const r = new RouteIndex(demoRoute(200));
  const first = advanceMotion({ ...initialState(), speed: 25 }, {}, 2, config);
  const second = advanceMotion(first.state, {}, 2, config);
  const e = findCrossings([...first.segments, ...second.segments], [{ id: 'a', offset: 0 }], r);
  assert.equal(e.length, 8);
  assert.equal(new Set(e.map((x) => x.objectId)).size, 8);
});
test('negative trailing axle positions emit no contacts', () => {
  const { segments } = advanceMotion({ ...initialState(), speed: 1 }, {}, 1, config);
  assert.equal(findCrossings(segments, [{ id: 'rear', offset: 20 }], route).length, 0);
});
test('route rejects invalid ordering and duplicate IDs', () => {
  assert.throws(
    () =>
      new RouteIndex({
        length: 10,
        stations: [],
        events: [
          { id: 'a', position: 5, side: 'left', type: 'joint' },
          { id: 'a', position: 3, side: 'left', type: 'joint' },
        ],
      }),
  );
});
test('three carriages have twelve unique wheelsets', () => {
  let w = wheelsets(3);
  assert.equal(w.length, 12);
  assert.ok(Math.abs(w.at(-1).offset - 68.9) < 1e-9);
  assert.equal(new Set(w.map((x) => x.id)).size, 12);
});
test('welded string welds are silent while its end joints still produce crossings', () => {
  const r = new RouteIndex({
    length: 900,
    stations: [],
    events: [
      { id: 'weld', position: 25, side: 'left', type: 'weld' },
      { id: 'end-left', position: 800, side: 'left', type: 'joint' },
      { id: 'end-right', position: 800, side: 'right', type: 'joint' },
    ],
  });
  const segments = [{ start: { position: 0, speed: 20, time: 0 }, duration: 41, acceleration: 0 }];
  assert.deepEqual(
    findCrossings(segments, [{ id: 'a', offset: 0 }], r).map((e) => e.objectId),
    ['end-left', 'end-right'],
  );
  assert.equal(r.events.length, 3, 'weld remains in the route data');
});

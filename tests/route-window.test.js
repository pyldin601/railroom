import test from 'node:test';
import assert from 'node:assert/strict';
import * as map from '../src/ui/route-map.js';

test('route window is capped at 1000 km and follows the train within route bounds', () => {
  assert.equal(typeof map.routeWindow, 'function');
  assert.deepEqual(map.routeWindow(4610000, 0), { start: 0, end: 1000000, length: 1000000, head: 0 });
  assert.deepEqual(map.routeWindow(4610000, 580000), { start: 80000, end: 1080000, length: 1000000, head: 50 });
  assert.deepEqual(map.routeWindow(4610000, 2690000), { start: 2190000, end: 3190000, length: 1000000, head: 50 });
  assert.deepEqual(map.routeWindow(4610000, 4610000), { start: 3610000, end: 4610000, length: 1000000, head: 100 });
});
test('short routes stay fully visible and train positions are bounded', () => {
  assert.equal(typeof map.routeWindow, 'function');
  assert.deepEqual(map.routeWindow(64000, 32000), { start: 0, end: 64000, length: 64000, head: 50 });
  assert.equal(map.routeWindow(64000, -10).head, 0);
  assert.equal(map.routeWindow(64000, 65000).head, 100);
});

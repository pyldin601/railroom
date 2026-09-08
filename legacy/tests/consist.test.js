import test from 'node:test';
import assert from 'node:assert/strict';
import { wheelsets, listenerSeat } from '../src/route/route-index.js';
test('ten carriages have forty distinct wheelsets and the seat is inside carriage five', () => {
  const axles = wheelsets(10);
  assert.equal(axles.length, 40);
  assert.equal(new Set(axles.map((a) => a.id)).size, 40);
  assert.ok(Math.abs(axles.at(-1).offset - 242.15) < 1e-9);
  assert.ok(Math.abs(listenerSeat(10) - 108.7) < 1e-9);
  for (const local of [2, 9.7, 17.4]) {
    const seat = listenerSeat(10, local);
    assert.ok(seat > axles[16].offset && seat < axles[19].offset);
  }
  assert.equal(listenerSeat(1), 9.7);
  assert.equal(listenerSeat(1, 19), 19);
});

test('Cairo bogie geometry and inter-car axle gap match documented dimensions', () => {
  const a = wheelsets(2);
  assert.deepEqual(
    a.slice(0, 4).map((x) => x.offset),
    [0, 2.4, 17, 19.4],
  );
  assert.ok(Math.abs(a[4].offset - a[3].offset - 5.35) < 1e-9);
});

test('default consist has ten carriages with the supplied dimensions', () => {
  const axles = wheelsets();
  assert.equal(axles.length, 40);
  const expected = [0, 2.4, 17, 19.4, 24.75, 27.15, 41.75, 44.15];
  axles.slice(0, 8).forEach((axle, i) => assert.ok(Math.abs(axle.offset - expected[i]) < 1e-9));
  assert.equal(listenerSeat(10), 108.7);
});

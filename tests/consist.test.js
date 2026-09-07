import test from 'node:test';
import assert from 'node:assert/strict';
import { wheelsets, listenerSeat } from '../src/route/route-index.js';
test('ten carriages have forty distinct wheelsets and the seat is inside carriage five', () => {
  const axles = wheelsets(10);
  assert.equal(axles.length, 40);
  assert.equal(new Set(axles.map((a) => a.id)).size, 40);
  assert.ok(Math.abs(axles.at(-1).offset - 261.664) < 1e-9);
  assert.ok(Math.abs(listenerSeat(10) - 117.484) < 1e-9);
  for (const local of [2, 10.7, 19.4]) {
    const seat = listenerSeat(10, local);
    assert.ok(seat > axles[16].offset && seat < axles[19].offset);
  }
  assert.equal(listenerSeat(1), 10.7);
  assert.equal(listenerSeat(1, 19), 19);
});

test('61-779 bogie geometry and inter-car axle gap match documented dimensions', () => {
  const a = wheelsets(2);
  assert.deepEqual(
    a.slice(0, 4).map((x) => x.offset),
    [0, 2.4, 19, 21.4],
  );
  assert.ok(Math.abs(a[4].offset - a[3].offset - 5.296) < 1e-9);
});

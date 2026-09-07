import test from 'node:test';
import assert from 'node:assert/strict';
import { carriageGain, occupiedCarriage } from '../src/audio/carriage-isolation.js';
test('only five carriages transmit sound around the middle listener', () => {
  assert.deepEqual(
    Array.from({ length: 10 }, (_, i) => carriageGain(i + 1, 5)),
    [0, 0, 0.05, 0.3, 1, 0.3, 0.05, 0, 0, 0],
  );
  for (const seat of [101, 108.7, 116.4]) assert.equal(occupiedCarriage(seat), 5);
  assert.equal(occupiedCarriage(10), 1);
});

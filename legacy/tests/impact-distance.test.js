import test from 'node:test';
import assert from 'node:assert/strict';
import { impactDistance } from '../src/audio/impact-distance.js';
test('impact attenuation includes wheel distance and carriage separation', () => {
  const near = impactDistance({ car: 5, offset: 110 }, 117, 5, 'left');
  const farWheel = impactDistance({ car: 5, offset: 125 }, 117, 5, 'left');
  const farCar = impactDistance({ car: 9, offset: 220 }, 117, 5, 'left');
  assert.ok(near.direct > farWheel.direct);
  assert.ok(farCar.direct > 0 && farCar.direct < near.direct);
  assert.ok(
    farCar.metal / near.metal > farCar.direct / near.direct,
    'structure layer retains more distant energy',
  );
});
test('both layers respond to a changed seat position', () => {
  const axle = { car: 5, offset: 110 };
  const near = impactDistance(axle, 110, 5, 'left'),
    far = impactDistance(axle, 125, 5, 'left');
  assert.ok(near.direct > far.direct && near.metal > far.metal);
});
test('changing a carriage label cannot change the gain at the same wheel distance', () => {
  const first = impactDistance({ car: 4, offset: 100 }, 117, 5, 'left');
  const second = impactDistance({ car: 3, offset: 100 }, 117, 5, 'left');
  assert.deepEqual(first, second);
});
test('near and far ends of the adjacent carriage have distinct distance gains', () => {
  const seat = 108.7;
  const near = impactDistance({ car: 4, offset: 93.65 }, seat, 5, 'left');
  const far = impactDistance({ car: 4, offset: 74.25 }, seat, 5, 'left');
  assert.ok(near.direct / far.direct > 3, 'direct impact changes clearly across the carriage');
  assert.ok(near.metal / far.metal > 1.5, 'metal also varies with wheel distance');
  assert.ok(near.metal / far.metal < near.direct / far.direct, 'metal keeps its longer reach');
});
test('every wheel in the occupied carriage is louder than external wheels at all seat presets', () => {
  for (const localSeat of [2, 9.7, 17.4]) {
    const seat = 4 * 24.75 + localSeat,
      inside = [],
      outside = [];
    for (let car = 1; car <= 10; car++)
      for (const offset of [0, 2.4, 17, 19.4]) {
        const gain = impactDistance({ car, offset: (car - 1) * 24.75 + offset }, seat, 5, 'left');
        (car === 5 ? inside : outside).push(gain);
      }
    for (const layer of ['direct', 'metal'])
      assert.ok(
        Math.min(...inside.map((g) => g[layer])) > Math.max(...outside.map((g) => g[layer])),
        `${layer} at seat ${localSeat}`,
      );
  }
});
test('adjacent carriage impacts are more audible from the middle seat', () => {
  const g = impactDistance({ car: 4, offset: 93.65 }, 108.7, 5, 'left');
  assert.ok(g.direct > 0.24 && g.direct < 0.26);
  assert.ok(g.metal * 0.35 > 0.23 && g.metal * 0.35 < 0.25);
});
test('double metal reach preserves direct impacts and increases distant metal energy', () => {
  const axle = { car: 9, offset: 220 },
    seat = 108.7;
  const normal = impactDistance(axle, seat, 5, 'left');
  const extended = impactDistance(axle, seat, 5, 'left', 2);
  assert.equal(extended.direct, normal.direct);
  assert.ok(extended.metal > normal.metal * 2, 'far metal decays more slowly');
  const farther = impactDistance(axle, seat, 5, 'left', 4);
  assert.ok(farther.metal > extended.metal);
  assert.equal(farther.direct, normal.direct);
  for (const reach of [2, 4])
    for (const localSeat of [2, 9.7, 17.4]) {
      const s = 4 * 24.75 + localSeat;
      const inside = [0, 2.4, 17, 19.4].map(
        (x) => impactDistance({ car: 5, offset: 4 * 24.75 + x }, s, 5, 'left', reach).metal,
      );
      for (let car = 1; car <= 10; car++)
        if (car !== 5)
          for (const x of [0, 2.4, 17, 19.4])
            assert.ok(
              impactDistance({ car, offset: (car - 1) * 24.75 + x }, s, 5, 'left', reach).metal <
                Math.min(...inside),
            );
    }
});
test('end-carriage hiss fades smoothly by wheel position rather than carriage boundaries', async () => {
  const { endHissGain } = await import('../src/audio/impact-distance.js');
  const length = 9 * 24.75 + 19.4;
  assert.ok(Math.abs(endHissGain({ car: 1, offset: 0 }, 5, 10) - 0.1) < 1e-10);
  assert.equal(endHissGain({ car: 5, offset: 117 }, 5, 10), 1);
  for (const x of [10, 24.75, 49.5, 70]) {
    const left = endHissGain({ car: 2, offset: x }, 5, 10);
    const right = endHissGain({ car: 9, offset: length - x }, 5, 10);
    assert.ok(Math.abs(left - right) < 1e-10);
    assert.ok(Math.abs(endHissGain({ car: 2, offset: x + 0.01 }, 5, 10) - left) < 0.001);
  }
  assert.ok(
    endHissGain({ car: 3, offset: 60 }, 5, 10) > endHissGain({ car: 2, offset: 30 }, 5, 10),
  );
});

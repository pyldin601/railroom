import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { RouteIndex } from '../src/route/route-index.js';
import { findCrossings } from '../src/simulation/crossings.js';

function generated(block, length) {
  return JSON.parse(execFileSync('python3', ['-c', `import json,runpy
m=runpy.run_path('scripts/build-lisbon-route.py')
f=m.get('build_rails')
print(json.dumps(f(${length}, '${block}') if f else None))`],
  { cwd: new URL('../', import.meta.url), encoding: 'utf8' }));
}

test('800 m areas mix direct joins and a short connector after each fifth full rail', () => {
  const rails = generated('long-800', 10000);
  assert.ok(Array.isArray(rails), 'rail block generator exists');
  assert.deepEqual(rails.slice(0, 7), [800, 800, 800, 800, 800, 12.5, 800]);
  assert.equal(rails.reduce((a, b) => a + b, 0), 10000);
  assert.ok(rails.slice(0, -1).every(size => size === 800 || size === 12.5));
  assert.deepEqual(generated('long-800', 4012.5), [800, 800, 800, 800, 800, 12.5]);
  // A final 12.5 here is a shortened last long rail, not a dangling connector.
  assert.deepEqual(generated('long-800', 4000), [800, 800, 800, 800, 800]);
});

test('1500 m areas have direct joins and only their final rail may be shortened', () => {
  assert.deepEqual(generated('long-1500', 4600), [1500, 1500, 1500, 100]);
  assert.deepEqual(generated('long-1500', 4500), [1500, 1500, 1500]);
});

test('reduced areas fill exact lengths using complete allowed full/short groups', () => {
  for (const length of [112.5, 125, 137.5, 150, 6000, 8000, 12000, 24000]) {
    const rails = generated('short-25', length);
    assert.ok(Array.isArray(rails));
    assert.equal(rails.reduce((a,b) => a+b, 0), length);
    let index = 0;
    while (index < rails.length) {
      let full = 0, short = 0;
      while (rails[index] === 25) { index++; full++; }
      while (rails[index] === 12.5) { index++; short++; }
      assert.ok([4,5].includes(full) && [1,2].includes(short), `invalid group ${full}/${short}`);
    }
  }
});

const blockFixture = {
  id: 'blocks', contactModel: 'rail-blocks-v1', length: 3212.5,
  sections: [
    { position: 0, length: 1612.5, block: 'long-800', railLengths: [800, 12.5, 800] },
    { position: 1612.5, length: 1500, block: 'long-1500', railLengths: [1500] },
    { position: 3112.5, length: 100, block: 'long-1500', railLengths: [100] },
  ],
  stations: [{ name: 'No extra boundary', position: 400 }],
  operatingMarkers: [{ type: 'speed_limit', position: 600, endPosition: 3212.5, speedKmh: 260 }],
};
test('rail boundaries produce one contact per side, no fabrication welds or annotation joints', () => {
  const route = new RouteIndex(blockFixture);
  const contacts = route.between(-1, route.length);
  assert.deepEqual(contacts.filter(e => e.side === 'left').map(e => e.position), [800, 812.5, 1612.5, 3112.5]);
  assert.ok(contacts.every(e => e.type === 'joint'));
  assert.equal(route.contactCount, 8);
  assert.equal(route.events.length, 0);
  assert.deepEqual([...route.between(0, 812.5 - 5e-9), ...route.between(812.5 - 5e-9, route.length)], contacts);
  assert.deepEqual(route.between(3000, 3200), contacts.filter(e => e.position > 3000 && e.position <= 3200));
  const impacts = findCrossings([{ start: { position: 790, speed: 25, time: 0 }, duration: 1, acceleration: 0 }], [{ id: 'wheel', offset: 0 }], route);
  assert.deepEqual(impacts.map(e => e.position), [800, 800, 812.5, 812.5]);
});

test('rail block contact index rejects missing coverage and invalid lengths', () => {
  for (const railLengths of [[], [0], [-1], [NaN], [100]])
    assert.throws(() => new RouteIndex({ ...blockFixture, sections: [{ position: 0, length: 3212.5, railLengths }] }));
});

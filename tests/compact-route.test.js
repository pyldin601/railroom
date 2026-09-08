import test from 'node:test';
import assert from 'node:assert/strict';
import { RouteIndex } from '../src/route/route-index.js';

const fixture = {
  id: 'fixture', length: 300, contactModel: 'periodic-v1',
  sections: [
    { position: 0, length: 200, construction: 'jointed' },
    { position: 200, length: 100, construction: 'welded' },
  ],
};
test('compact contacts match an explicit fixture across boundaries and adjacent queries', () => {
  const route = new RouteIndex(fixture);
  const expected = [25, 50, 75, 100, 125, 150, 175, 187.5, 200, 225, 250, 275];
  const contacts = route.between(0, 300);
  assert.deepEqual(contacts.filter(e => e.side === 'left').map(e => e.position), expected);
  assert.equal(contacts.find(e => e.position === 200).type, 'joint');
  assert.equal(contacts.find(e => e.position === 225).type, 'weld');
  assert.equal(route.contactCount, 24);
  assert.equal(new Set(contacts.map(e => e.id)).size, contacts.length);
  assert.deepEqual([...route.between(0, 187.5), ...route.between(187.5, 300)], contacts);
  assert.deepEqual(route.between(175, 225), contacts.filter(e => e.position > 175 && e.position <= 225));
  assert.equal(route.events.length, 0);
});
test('compact sections reject gaps and unsupported construction', () => {
  assert.throws(() => new RouteIndex({ ...fixture, sections: [{ position: 1, length: 299, construction: 'welded' }] }));
  assert.throws(() => new RouteIndex({ ...fixture, sections: [{ position: 0, length: 300, construction: 'unknown' }] }));
});

test('fractional query boundaries preserve contacts using the explicit-index tolerance', () => {
  const route = new RouteIndex(fixture);
  for (const split of [25 - 5e-9, 200 - 5e-9])
    assert.deepEqual([...route.between(0, split), ...route.between(split, 300)], route.between(0, 300));
});

test('zone rail patterns produce distinct 12.5 m, 25 m and mixed contact rhythms', () => {
  const route = new RouteIndex({
    id: 'varied', length: 300, contactModel: 'periodic-v1', sections: [
      { position: 0, length: 100, construction: 'jointed', railPattern: [12.5] },
      { position: 100, length: 100, construction: 'jointed', railPattern: [25] },
      { position: 200, length: 100, construction: 'jointed', railPattern: [25, 25, 12.5] },
    ],
  });
  const contacts = route.between(0, 300);
  assert.deepEqual(contacts.filter(e => e.side === 'left').map(e => e.position),
    [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100, 125, 150, 175, 200, 225, 250, 262.5, 287.5]);
  assert.equal(route.contactCount, contacts.length);
  assert.deepEqual([...route.between(0, 100), ...route.between(100, 200), ...route.between(200, 300)], contacts);
  assert.deepEqual(route.between(249, 290), contacts.filter(e => e.position > 249 && e.position <= 290));
});

test('compact contact patterns reject empty or unsupported rail sizes', () => {
  for (const railPattern of [[], [0], [-25], [NaN], [10], '25'])
    assert.throws(() => new RouteIndex({ ...fixture, sections: [
      { position: 0, length: 300, construction: 'jointed', railPattern },
    ] }));
});

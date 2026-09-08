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

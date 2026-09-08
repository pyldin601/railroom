import test from 'node:test';
import assert from 'node:assert/strict';
import { demoRoute } from '../src/route/route-index.js';

for (const spacing of [12.5, 25]) {
  test(`${spacing} m demo has paired joints at every rail boundary`, () => {
    const route = demoRoute(100, spacing);
    const expected = [];
    for (let position = spacing; position < 100; position += spacing)
      for (const side of ['left', 'right']) expected.push([position, side, 'joint']);
    assert.deepEqual(
      route.events.map((e) => [e.position, e.side, e.type]),
      expected,
    );
    assert.equal(new Set(route.events.map((e) => e.id)).size, expected.length);
    assert.equal(route.length, 100);
    for (const side of ['left', 'right']) {
      const rails = route.rails.filter((rail) => rail.side === side);
      assert.equal(rails.length, 100 / spacing);
      rails.forEach((rail, i) => {
        assert.equal(rail.position, i * spacing);
        assert.equal(rail.length, spacing);
        assert.equal(rail.construction, 'jointed');
      });
    }
  });
}
test('default demo remains 25 m', () => {
  assert.deepEqual(demoRoute(100), demoRoute(100, 25));
});

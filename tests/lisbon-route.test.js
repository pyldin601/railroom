import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { RouteIndex } from '../src/route/route-index.js';
import { advanceMotion, initialState } from '../src/simulation/motion.js';
import { Autopilot } from '../src/simulation/autopilot.js';
const asset = new URL('../public/kyiv-lisbon.json', import.meta.url);
function load() {
  assert.ok(existsSync(asset), 'Kyiv–Lisbon asset exists');
  return JSON.parse(readFileSync(asset));
}
test('Lisbon asset preserves the approved itinerary, distances and complete coverage', () => {
  const data = load();
  assert.deepEqual(data.stations.map(s => s.name), ['Kyiv', 'Shepetivka', 'Lviv', 'Przemyśl', 'Kraków', 'Katowice', 'Wrocław', 'Dresden', 'Leipzig', 'Frankfurt am Main', 'Strasbourg', 'Paris', 'Bordeaux', 'Hendaye', 'Irún', 'Burgos', 'Valladolid', 'Salamanca', 'Guarda', 'Coimbra', 'Lisbon']);
  assert.deepEqual(data.stations.map(s => s.position / 1000), [0, 300, 580, 680, 930, 1010, 1210, 1480, 1600, 1980, 2200, 2690, 3270, 3500, 3505, 3785, 3905, 4030, 4190, 4390, 4610]);
  assert.deepEqual([...new Set(data.stations.map(s => s.country))], ['UA', 'PL', 'DE', 'FR', 'ES', 'PT']);
  assert.equal(data.length, 4610000);
  assert.ok(readFileSync(asset).length < 1000000);
  const jointed = data.sections.filter(s => s.construction === 'jointed');
  assert.equal(jointed.length, 12);
  assert.ok(new Set(jointed.map(s => s.length)).size >= 5);
  assert.equal(data.contactModel, 'rail-blocks-v1');
  assert.ok(jointed.every(s => s.block === 'short-25'));
  const longAreas = data.sections.filter(s => s.block !== 'short-25');
  longAreas.forEach((s, i) => assert.equal(s.block, i % 2 ? 'long-1500' : 'long-800'));
  let end = 0;
  for (const s of data.sections) {
    assert.equal(s.position, end);
    end += s.length;
    assert.equal(s.railLengths.reduce((a,b) => a+b, 0), s.length);
    if (s.construction === 'jointed') assert.ok(s.length >= 6000 && s.length <= 24000);
  }
  assert.equal(end, data.length);
  end = 0;
  for (const [i, m] of data.operatingMarkers.entries()) {
    assert.equal(m.type, 'speed_limit');
    assert.equal(m.position, end);
    end = m.endPosition;
    if (i) assert.notEqual(m.speedKmh, data.operatingMarkers[i - 1].speedKmh);
  }
  assert.equal(end, data.length);
  const route = new RouteIndex(data);
  assert.equal(route.events.length, 0);
  const railCount = data.sections.reduce((total, s) => total + s.railLengths.length, 0);
  assert.equal(route.contactCount, 2 * (railCount - 1));
  assert.ok(route.contactCount < 40000);
  const nearEnd = route.between(data.length - 100, data.length);
  assert.ok(nearEnd.length > 0 && nearEnd.length < 20);
  assert.ok(nearEnd.every(e => e.position < data.length));
  // Inspect work, not wall-clock timing: a short query never enumerates the prefix.
  let calls = 0;
  route.compact.boundaries = new Proxy(route.compact.boundaries, {
    get(target, key) {
      if (/^\d+$/.test(String(key))) calls++;
      return Reflect.get(target, key, target);
    },
  });
  assert.deepEqual(route.between(data.length - 100, data.length), nearEnd);
  assert.ok(calls < 100);
});
test('new-route autopilot approaches, dwells, resumes and finishes at Lisbon', () => {
  const route = new RouteIndex(load());
  for (const station of [route.stations[1], route.stations[14], route.stations.at(-1)]) {
    const state = { position: station.position - 500, speed: 20, time: 0 };
    const pilot = new Autopilot(route, state);
    const approaching = pilot.update(state);
    assert.ok(approaching.brake > 0);
    Object.assign(state, { position: station.position, speed: 0, time: 100 });
    assert.equal(pilot.update(state).stopPosition, station.position);
    assert.match(pilot.status, /60s/);
    state.time = 161;
    pilot.update(state);
    assert.equal(pilot.status, station === route.stations.at(-1) ? 'Journey complete' : 'Departure horn');
  }
});

test('committed asset matches the deterministic builder', () => {
  const root = new URL('../', import.meta.url);
  const generated = execFileSync('python3', ['-c', "import runpy,json; m=runpy.run_path('scripts/build-lisbon-route.py'); print(json.dumps(m['build_route'](),ensure_ascii=False))"], { cwd: root, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(generated), load());
});

test('short motion simulations stop gently and dwell at Shepetivka, Irún and Lisbon', () => {
  const route = new RouteIndex(load());
  for (const station of [route.stations[1], route.stations[14], route.stations.at(-1)]) {
    let state = { ...initialState(station.position - 2500), speed: 20 };
    const pilot = new Autopilot(route, state, 261);
    let arrivalTime = null;
    for (let i = 0; i < 20000 && pilot.index === 0; i++) {
      const controls = pilot.update(state);
      if (pilot.arrivedAt !== null) arrivalTime ??= state.time;
      const next = advanceMotion(state, controls, 0.1, {
        length: controls.stopPosition,
        powerAt: p => route.powerAt(p), nextPower: p => route.nextPower(p),
      }).state;
      if (next.position === station.position && state.position < station.position)
        assert.ok(state.speed < 0.2, `${station.name} arrival speed ${state.speed}`);
      state = next;
    }
    assert.equal(pilot.index, 1, `${station.name} stop completed`);
    assert.ok(arrivalTime !== null && state.time - arrivalTime >= 60);
    assert.equal(pilot.status, station === route.stations.at(-1) ? 'Journey complete' : 'Departure horn');
  }
});

test('Kyiv–Lisbon varies restrictions between 40, 50 and 60 with terminal and running limits preserved', () => {
  const data = load();
  const limits = data.operatingMarkers;
  assert.deepEqual([...new Set(limits.map(m => m.speedKmh))].sort((a, b) => a - b), [25, 40, 50, 60, 260]);
  const at = p => limits.find(m => m.position <= p && p < m.endPosition).speedKmh;
  assert.equal(at(0), 25);
  assert.equal(at(999), 25);
  assert.equal(at(1000), 60);
  assert.equal(at(6000), 260);
  assert.equal(at(data.length - 1000), 25);
  for (const [i, station] of data.stations.slice(1, -1).entries()) {
    assert.equal(at(station.position - 1000), [40, 50, 60][i % 3]);
    assert.equal(at(station.position + 999), [40, 50, 60][i % 3]);
    assert.equal(at(station.position + 1000), 260);
  }
  for (const [i, section] of data.sections.filter(s => s.construction === 'jointed').entries()) {
    assert.equal(at(section.position), section.position === 0 ? 25 : [60, 40, 50][i % 3]);
    assert.equal(at(section.position + section.length - 1), section.position + section.length === data.length ? 25 : [60, 40, 50][i % 3]);
    if (section.position + section.length < data.length) assert.equal(at(section.position + section.length), 260);
  }
});

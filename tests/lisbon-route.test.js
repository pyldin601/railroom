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
test('Lisbon asset preserves the approved itinerary, rounded corridor distances and complete coverage', () => {
  const data = load();
  assert.deepEqual(data.stations.map(s => s.name), ['Kyiv', 'Shepetivka', 'Lviv', 'Przemyśl', 'Kraków', 'Katowice', 'Wrocław', 'Dresden', 'Leipzig', 'Frankfurt am Main', 'Strasbourg', 'Paris', 'Bordeaux', 'Hendaye', 'Irún', 'Burgos', 'Valladolid', 'Salamanca', 'Guarda', 'Coimbra', 'Lisbon']);
  assert.deepEqual(data.stations.map(s => s.position / 1000), [0, 305, 575, 670, 925, 1000, 1180, 1450, 1570, 1945, 2165, 2605, 3140, 3375, 3377, 3642, 3772, 3892, 4062, 4232, 4447]);
  assert.deepEqual([...new Set(data.stations.map(s => s.country))], ['UA', 'PL', 'DE', 'FR', 'ES', 'PT']);
  assert.equal(data.length, 4447000);
  assert.ok(readFileSync(asset).length < 1000000);
  const jointed = data.sections.filter(s => s.construction === 'jointed');
  assert.equal(jointed.length, 6);
  assert.ok(new Set(jointed.map(s => s.length)).size >= 4);
  assert.equal(data.contactModel, 'rail-blocks-v1');
  assert.ok(jointed.every(s => s.block === 'short-25' && s.purpose === 'rail-replacement'));
  const longAreas = data.sections.filter(s => s.block !== 'short-25');
  longAreas.forEach((s, i) => assert.equal(s.block, i % 2 ? 'long-1500' : 'long-800'));
  let end = 0;
  for (const s of data.sections) {
    assert.equal(s.position, end);
    end += s.length;
    assert.equal(s.railLengths.reduce((a,b) => a+b, 0), s.length);
    if (s.construction === 'jointed') assert.ok(s.length >= 1000 && s.length <= 2000);
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
  const nearEnd = route.between(data.length - 5000, data.length);
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
  assert.deepEqual(route.between(data.length - 5000, data.length), nearEnd);
  assert.ok(calls < 100);
});
test('new-route autopilot approaches, dwells, resumes and finishes at Lisbon', () => {
  const route = new RouteIndex(load());
  for (const station of [route.stations[1], route.stations[2], route.stations[14], route.stations.at(-1)]) {
    const state = { position: station.position - 500, speed: 20, time: 0 };
    const pilot = new Autopilot(route, state);
    const approaching = pilot.update(state);
    assert.ok(approaching.brake > 0);
    Object.assign(state, { position: station.position, speed: 0, time: 100 });
    assert.equal(pilot.update(state).stopPosition, station.position);
    assert.ok(pilot.status.includes(station.dwellSeconds ? `${station.dwellSeconds / 60}m 00s` : '60s'));
    state.time = 100 + (station.dwellSeconds ?? 60);
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
  for (const station of [route.stations[1], route.stations[2], route.stations[14], route.stations.at(-1)]) {
    const previous = route.stations[route.stations.indexOf(station) - 1];
    const start = Math.max(station.position - 2500, previous.position + 100);
    let state = { ...initialState(start), speed: 20 };
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
    assert.equal(state.position, station.position, `${station.name} was the station actually reached`);
    assert.equal(pilot.index, 1, `${station.name} stop completed`);
    assert.ok(arrivalTime !== null && state.time - arrivalTime >= (station.dwellSeconds ?? 60));
    assert.equal(pilot.status, station === route.stations.at(-1) ? 'Journey complete' : 'Departure horn');
  }
});

test('simplified passenger corridors vary running limits while retaining local restrictions and the 260 cap', () => {
  const data = load();
  assert.equal(data.speedProfile, 'simplified-passenger-corridors');
  const at = p => data.operatingMarkers.find(m => m.position <= p && p < m.endPosition).speedKmh;
  assert.equal(at(0), 25);
  assert.equal(at(data.length - 1), 25);
  assert.equal(at(100000), 160, 'Ukrainian running corridor');
  assert.equal(at(2450000), 260, 'French high-speed corridor');
  assert.equal(at(4320000), 160, 'Portuguese conventional section');
  const speeds = new Set(data.operatingMarkers.map(m => m.speedKmh));
  for (const v of [25,40,50,60,80,90,100,110,120,130,140,160,200,220,260]) assert.ok(speeds.has(v), `speed ${v}`);
  assert.ok([...speeds].every(v => v <= 260));
  assert.ok(data.operatingMarkers.every(m => m.status === 'estimated' && m.basis === 'simplified-scenario'));
  assert.ok(data.operatingMarkers.length < 160, 'coarse readable profile, not every track-level change');
  for (const [i, station] of data.stations.slice(1, -1).entries()) {
    assert.ok(at(station.position) <= [40,50,60][i % 3]);
  }
});

test('local speed restrictions do not require short rails outside replacement works', () => {
  const data = load();
  const sectionAt = p => data.sections.find(s => s.position <= p && p < s.position+s.length);
  const speedAt = p => data.operatingMarkers.find(s => s.position <= p && p < s.endPosition).speedKmh;
  assert.equal(sectionAt(116500).purpose, 'rail-replacement');
  assert.equal(speedAt(116500), 40);
  assert.equal(sectionAt(120000).construction, 'long-rail');
  assert.equal(speedAt(120000), 40, 'same local limit continues after rail replacement works');
  assert.equal(sectionAt(0).construction, 'long-rail');
  assert.equal(speedAt(0), 25);
  assert.equal(sectionAt(data.length-1).construction, 'long-rail');
  assert.equal(speedAt(data.length-1), 25);
  assert.ok(data.sections.filter(s => s.purpose === 'rail-replacement').reduce((n,s) => n+s.length,0) <= 12000);
});

test('Lisbon passenger stops allocate ten minutes to hubs and five to other intermediate stations', () => {
  const stops = load().stations.slice(1,-1);
  assert.ok(stops.every(s => [300,600].includes(s.dwellSeconds)));
  assert.equal(stops.filter(s => s.dwellSeconds === 600).length, 10);
  assert.equal(stops.find(s => s.name === 'Paris').dwellSeconds, 600);
  assert.equal(stops.find(s => s.name === 'Shepetivka').dwellSeconds, 300);
  assert.equal(stops.reduce((n,s) => n+s.dwellSeconds,0), 8700);
});

test('only some long-string joins in high-speed running are welded', () => {
  const data = load();
  const route = new RouteIndex(data);
  const speedAt = p => data.operatingMarkers.find(m => m.position <= p && p < m.endPosition).speedKmh;
  let welded = 0, regular = 0;
  for (const section of data.sections) {
    let position = section.position;
    for (let i = 0; i < section.railLengths.length; i++) {
      if ((section.weldedJoins || []).includes(i)) {
        welded++;
        assert.ok(i > 0 && section.railLengths[i-1] >= 800 && section.railLengths[i] >= 800);
        assert.ok(speedAt(position-0.01) >= 200 && speedAt(position) >= 200);
        assert.ok(route.between(position-0.01,position).every(e => e.type === 'welded_joint'));
      } else if (i > 0) regular++;
      position += section.railLengths[i];
    }
  }
  assert.ok(welded > 0 && regular > welded);
});

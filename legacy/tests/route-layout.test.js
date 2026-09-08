import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { RouteIndex } from '../src/route/route-index.js';
const data = JSON.parse(readFileSync(new URL('../public/route.json', import.meta.url)));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
test('mixed route has continuous rail coverage with 12.5/25 m rails and welded strings up to 800 m', () => {
  assert.ok(data.rails?.length, 'explicit rail spans required');
  for (const side of ['left', 'right']) {
    const rails = data.rails.filter((r) => r.side === side);
    let end = 0;
    for (const r of rails) {
      assert.equal(r.position, end);
      assert.ok(uuid.test(r.id));
      assert.ok(r.length > 0 && r.length <= 800);
      assert.equal(r.length % 12.5, 0);
      if (r.construction === 'jointed') assert.ok([12.5, 25].includes(r.length));
      end += r.length;
    }
    assert.equal(end, 64000);
    assert.ok(rails.some((r) => r.length === 800));
    assert.ok(rails.some((r) => r.length === 25));
  }
});
test('every rail boundary is a joint and every internal fabrication seam is a weld', () => {
  assert.ok(data.rails?.length);
  for (const side of ['left', 'right']) {
    const rails = data.rails.filter((r) => r.side === side);
    const boundaries = new Set(rails.slice(1).map((r) => r.position));
    const events = data.events.filter((e) => e.side === side);
    const seams = [];
    for (const rail of rails.filter((r) => r.construction === 'welded'))
      for (let p = rail.position + 25; p < rail.position + rail.length; p += 25) seams.push(p);
    assert.deepEqual(
      events.filter((e) => e.type === 'weld').map((e) => e.position),
      seams,
    );
    assert.ok(events.length > 2500);
    assert.deepEqual(
      events.filter((e) => e.type === 'joint').map((e) => e.position),
      [...boundaries],
    );
    for (const e of events) {
      assert.equal(e.type, boundaries.has(e.position) ? 'joint' : 'weld');
      assert.ok(uuid.test(e.id));
    }
  }
  assert.doesNotThrow(() => new RouteIndex(data));
  assert.equal(
    new Set([...data.rails, ...data.events, ...data.stations, ...data.sections].map((o) => o.id))
      .size,
    data.rails.length + data.events.length + data.stations.length + data.sections.length,
  );
});
test('jointed station approaches and long welded stretches follow an explicit plan', () => {
  assert.ok(data.sections?.length);
  let end = 0;
  for (const s of data.sections) {
    assert.equal(s.position, end);
    assert.ok(s.reason);
    end += s.length;
  }
  assert.equal(end, 64000);
  const at = (p) =>
    data.sections.find((s) => p >= s.position && p < s.position + s.length).construction;
  for (const p of [0, 7000, 35000, 63999]) assert.equal(at(p), 'jointed');
  for (const p of [3500, 12000, 23000, 47000]) assert.equal(at(p), 'welded');
  assert.equal(data.stations.length, 19);
  assert.equal(data.synthetic, true);
});
test('most string joins are direct, with occasional bounded connector groups', () => {
  const rails = data.rails.filter((r) => r.side === 'left');
  let direct = 0;
  const groups = [];
  for (let i = 0; i < rails.length; i++) {
    if (rails[i].construction === 'welded' && rails[i + 1]?.construction === 'welded') direct++;
    if (rails[i].purpose !== 'string connector') continue;
    const start = i,
      length = rails[i].length;
    while (rails[i + 1]?.purpose === 'string connector') i++;
    const group = rails.slice(start, i + 1);
    assert.equal(rails[start - 1].construction, 'welded');
    assert.equal(rails[i + 1].construction, 'welded');
    assert.ok(group.every((r) => r.length === length));
    assert.ok(group.length >= 1 && group.length <= (length === 12.5 ? 5 : 2));
    groups.push(length);
  }
  assert.ok(groups.includes(12.5) && groups.includes(25));
  assert.ok(direct > groups.length * 3, 'over 75% of joins remain direct');
});

test('all nineteen passenger stopping points are present in route order', () => {
  assert.deepEqual(
    data.stations.map((s) => s.name),
    [
      'Kyiv-Pasazhyrskyi',
      'Karavaievi Dachi',
      'Kyiv-Volynskyi',
      'Vyshneve',
      'Tarasivka',
      'Boiarka',
      'Maliutynka',
      'Shliakhova',
      'Hlevakha',
      'Danylivka (888 km)',
      'Vasylkiv I',
      'Korchi',
      'Motovylivka',
      'Bilky',
      'Pivni',
      'Vyshniaky',
      'Sorochyi Brid',
      'Snitynka',
      'Fastiv I',
    ],
  );
  data.stations.forEach((s, i) => {
    assert.ok(uuid.test(s.id));
    assert.equal(s.positionStatus, 'estimated');
    if (i) assert.ok(s.position > data.stations[i - 1].position);
  });
});

test('short rails occur in singles or pairs after every 5–10 full rails', () => {
  const rails = data.rails.filter((r) => r.side === 'left');
  const short = rails.filter((r) => r.length === 12.5);
  assert.ok(short.length > 16);
  const runs = [];
  for (let i = 0; i < rails.length; i++) {
    if (rails[i].length !== 12.5 || rails[i].purpose === 'string connector') continue;
    const start = i;
    while (rails[i + 1]?.length === 12.5) i++;
    runs.push(i - start + 1);
    assert.equal(rails[start - 1].length, 25);
    if (rails[i + 1]?.sectionId === rails[i].sectionId) assert.equal(rails[i + 1].length, 25);
  }
  assert.ok(runs.includes(1) && runs.includes(2));
  assert.ok(runs.every((n) => n <= 2));
  const jointed = rails.filter(
    (r) => r.construction === 'jointed' && r.purpose !== 'string connector',
  );
  assert.equal(
    jointed.reduce((sum, r) => sum + r.length, 0),
    18000,
  );
  for (const section of data.sections.filter(
    (s) => s.construction === 'jointed' && s.purpose !== 'string connector',
  )) {
    const spans = jointed.filter((r) => r.sectionId === section.id);
    let full = 0;
    for (let i = 0; i < spans.length; i++) {
      if (spans[i].length === 25) {
        full++;
        continue;
      }
      assert.ok(full >= 5 && full <= 10, `full rail run: ${full}`);
      full = 0;
      if (spans[i + 1]?.length === 12.5) i++;
    }
    assert.equal(full, 0, 'every jointed section ends with short rails');
    assert.equal(spans.at(-1).length, 12.5);
    assert.equal(spans.at(-1).position + 12.5, section.position + section.length);
    assert.ok(
      data.events
        .filter(
          (e) => e.position >= section.position && e.position < section.position + section.length,
        )
        .every((e) => e.type === 'joint'),
    );
  }
});

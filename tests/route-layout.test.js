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
test('welded sections have direct string joints without short adjustment clusters', () => {
  for (const section of data.sections.filter((s) => s.construction === 'welded')) {
    const spans = data.rails.filter((r) => r.sectionId === section.id && r.side === 'left');
    assert.ok(spans.every((r) => r.construction === 'welded' && r.length >= 700));
    for (const side of ['left', 'right']) {
      const joints = data.events.filter(
        (e) =>
          e.side === side &&
          e.type === 'joint' &&
          e.position > section.position &&
          e.position < section.position + section.length,
      );
      assert.deepEqual(
        joints.map((e) => e.position),
        spans.slice(1).map((r) => r.position),
      );
    }
  }
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
    if (rails[i].length !== 12.5) continue;
    const start = i;
    while (rails[i + 1]?.length === 12.5) i++;
    runs.push(i - start + 1);
    assert.equal(rails[start - 1].length, 25);
    assert.equal(rails[i + 1].length, 25);
  }
  assert.ok(runs.includes(1) && runs.includes(2));
  assert.ok(runs.every((n) => n <= 2));
  const jointed = rails.filter((r) => r.construction === 'jointed');
  assert.equal(
    jointed.reduce((sum, r) => sum + r.length, 0),
    18000,
  );
  for (const section of data.sections.filter((s) => s.construction === 'jointed')) {
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
    assert.ok(full >= 1 && full <= 10, 'section ends on a short remainder of full rails');
    assert.ok(
      data.events
        .filter(
          (e) => e.position >= section.position && e.position < section.position + section.length,
        )
        .every((e) => e.type === 'joint'),
    );
  }
});

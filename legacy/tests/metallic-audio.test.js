import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dir = new URL('../public/audio/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir)));
function wav(name) {
  const b = readFileSync(new URL(name, dir));
  let p = 12,
    rate,
    data;
  while (p < b.length) {
    const size = b.readUInt32LE(p + 4),
      kind = b.toString('ascii', p, p + 4);
    if (kind === 'fmt ') {
      assert.equal(b.readUInt16LE(p + 8), 1);
      assert.equal(b.readUInt16LE(p + 10), 1);
      rate = b.readUInt32LE(p + 12);
      assert.equal(b.readUInt16LE(p + 22), 16);
    }
    if (kind === 'data') data = b.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  return {
    rate,
    x: Array.from({ length: data.length / 2 }, (_, i) => data.readInt16LE(i * 2) / 32768),
  };
}
function brightness(x) {
  let diff = 0,
    power = 0;
  for (let i = 1; i < x.length; i++) {
    diff += (x[i] - x[i - 1]) ** 2;
    power += x[i] ** 2;
  }
  return diff / power;
}
test('metallic rolling restores midrange without a discontinuous loop seam', () => {
  const sample = manifest.samples.find((s) => s.kind === 'rolling');
  assert.equal(sample.url, 'rolling-rail.wav');
  const { x, rate } = wav(sample.url),
    old = wav('rolling.wav');
  assert.equal(rate, 48000);
  assert.ok(
    brightness(x) > brightness(old.x) * 3,
    'rolling must retain more than the old bass-only spectrum',
  );
  let peak = 0,
    power = 0;
  for (const v of x) {
    assert.ok(Number.isFinite(v));
    peak = Math.max(peak, Math.abs(v));
    power += v * v;
  }
  assert.ok(peak <= 0.501);
  assert.ok(Math.abs(x[0] - x.at(-1)) < 0.01, 'loop boundary jump');
  assert.ok(Math.sqrt(power / x.length) > 0.02);
  assert.equal(sample.loopEnd, x.length / rate);
});
test('all eight impacts keep their timing and add bounded ringing tails', () => {
  for (const sample of manifest.samples.filter((s) => s.kind === 'joint')) {
    assert.equal(sample.url, `${sample.id}-rail-reverb.wav`);
    assert.equal(sample.onset, 0.01);
    const { x, rate } = wav(sample.url);
    assert.equal(rate, 48000);
    assert.ok(x.length / rate >= 0.24);
    assert.ok(Math.abs(x[0]) < 0.001 && Math.abs(x.at(-1)) < 0.001);
    let peak = 0,
      tail = 0,
      head = 0;
    for (let i = 0; i < x.length; i++) {
      peak = Math.max(peak, Math.abs(x[i]));
      if (i > rate * 0.16) tail += x[i] ** 2;
      else head += x[i] ** 2;
    }
    assert.ok(peak <= 0.501);
    assert.ok(tail > 1e-5 && tail < head * 0.25, 'short audible but restrained metal decay');
  }
});

test('rail resonance remains audible after the contact and decays before the next event', () => {
  for (const s of manifest.samples.filter((s) => s.kind === 'joint')) {
    const { x, rate } = wav(s.url);
    assert.equal(x.length / rate, 1.0);
    const energy = (a, b) =>
      x.slice(Math.round(a * rate), Math.round(b * rate)).reduce((sum, v) => sum + v * v, 0);
    assert.ok(energy(0.18, 0.28) > 0.001, 'rail tail should survive the dry impact');
    assert.ok(energy(0.65, 0.75) < energy(0.18, 0.28) * 0.2, 'rail resonance must decay');
  }
});

test('rolling rail resonance changes the texture while preserving duration and level', () => {
  const { x } = wav('rolling-rail.wav'),
    old = wav('rolling-metal.wav').x;
  assert.equal(x.length, old.length);
  let difference = 0,
    power = 0;
  for (let i = 0; i < x.length; i++) {
    difference += (x[i] - old[i]) ** 2;
    power += old[i] ** 2;
  }
  assert.ok(difference / power > 0.01, 'resonance must change the audible texture');
});

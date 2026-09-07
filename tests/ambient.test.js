import test from 'node:test';
import assert from 'node:assert/strict';
import { cabinTexture, CabinAmbience } from '../src/audio/ambient.js';
test('cabin texture has quiet finite stereo audio and a continuous loop seam', () => {
  const channels = cabinTexture();
  let difference = 0;
  for (const data of channels) {
    let energy = 0,
      peak = 0;
    for (const v of data) {
      assert.ok(Number.isFinite(v));
      energy += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    assert.ok(energy / data.length > 0.001 && peak < 0.5);
    assert.ok(Math.abs(data[0] - data.at(-1)) < 0.15);
  }
  for (let i = 0; i < channels[0].length; i++)
    difference += Math.abs(channels[0][i] - channels[1][i]);
  assert.ok(difference > 100);
});
test('ambience stays quiet at rest, follows its own control and silences when paused', () => {
  const context = { currentTime: 0 },
    mixer = { levels: { ambient: 0.5 } };
  const ambience = new CabinAmbience(context, mixer);
  let level;
  ambience.voice = {
    gain: {
      gain: {
        setTargetAtTime(v) {
          level = v;
        },
      },
    },
  };
  ambience.update({ speed: 0 }, {}, true);
  assert.equal(level, 0.0325);
  ambience.update({ speed: 33 }, {}, true);
  assert.equal(level, 0.0325);
  mixer.levels.ambient = 0;
  ambience.update({ speed: 33 }, {}, true);
  assert.equal(level, 0);
  mixer.levels.ambient = 1;
  ambience.update({ speed: 33 }, {}, false);
  assert.equal(level, 0);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { Subject } from 'rxjs';
import { Rolling } from '../src/audio/rolling.ts';
import { Scene } from '../src/audio/scene.ts';

function audioParam(value = 1) {
  return {
    value,
    targets: [],
    setTargetAtTime(target, startTime, timeConstant) {
      this.targets.push({ target, startTime, timeConstant });
    },
  };
}

function audioNode(properties = {}) {
  return Object.assign(
    {
      connections: [],
      disconnected: false,
      connect(destination) {
        this.connections.push(destination);
        return destination;
      },
      disconnect() {
        this.disconnected = true;
      },
    },
    properties,
  );
}

function audioContext() {
  const context = {
    currentTime: 4,
    gains: [],
    sources: [],
    filters: [],
    createBiquadFilter() {
      const filter = audioNode({ frequency: audioParam(), Q: audioParam(), type: 'lowpass' });
      this.filters.push(filter);
      return filter;
    },
    createGain() {
      const gain = audioNode({ gain: audioParam() });
      this.gains.push(gain);
      return gain;
    },
    createBufferSource() {
      const source = audioNode({
        buffer: null,
        loop: false,
        playbackRate: audioParam(),
        started: false,
        stopped: false,
        start(when, offset) {
          this.startArgs = [when, offset];
          this.started = true;
        },
        stop() {
          this.stopped = true;
        },
      });
      this.sources.push(source);
      return source;
    },
  };
  return context;
}

test('Scene routes eight occupied-carriage wheel loops through the rolling mixer channel', () => {
  const context = audioContext();
  const buffer = { duration: 10 };
  const rollingInput = audioNode();
  const mixer = {
    inputs: { rolling: rollingInput },
    disposed: false,
    dispose() {
      this.disposed = true;
    },
  };
  const scene = new Scene(context, { rolling: buffer }, mixer);

  assert.ok(scene.rolling instanceof Rolling);
  scene.rolling.start();

  const [source] = context.sources;
  const [gain] = context.gains;
  assert.equal(source.buffer, buffer);
  assert.equal(source.loop, true);
  assert.equal(source.playbackRate.value, 2 ** (-17 / 1200));
  assert.equal(source.started, true);
  assert.equal(context.sources.length, 8);
  const rates = [-17, 7, 15, -8, 11, -14, -4, 10];
  for (const [i, wheel] of context.sources.entries()) {
    assert.equal(wheel.buffer, buffer);
    assert.equal(wheel.loop, true);
    assert.equal(wheel.playbackRate.value, 2 ** (rates[i] / 1200));
    assert.deepEqual(wheel.startArgs, [4, ((i * 0.371) % 1) * buffer.duration]);
    assert.equal(wheel.connections.length, 2);
    for (const [j, first] of wheel.connections.entries()) {
      const second = first.connections[0];
      for (const filter of [first, second]) {
        assert.equal(filter.type, j === 0 ? 'lowpass' : 'highpass');
        assert.equal(filter.frequency.value, 500);
        assert.equal(filter.Q.value, 20 * Math.log10(Math.SQRT1_2));
      }
      assert.deepEqual(second.connections, [gain]);
    }
  }
  scene.rolling.start();
  assert.equal(context.sources.length, 8);
  assert.deepEqual(gain.connections, [rollingInput]);

  scene.dispose();
  assert.equal(source.stopped, true);
  assert.equal(source.disconnected, true);
  assert.equal(gain.disconnected, true);
  assert.equal(mixer.disposed, true);
  assert.ok(context.sources.every((source) => source.stopped && source.disconnected));
  assert.ok(context.filters.every((filter) => filter.disconnected));
});

test('Scene starts rolling and maps speed to its gain', () => {
  const context = audioContext();
  const speed$ = new Subject();
  const mixer = {
    inputs: { rolling: audioNode() },
    dispose() {},
  };
  const scene = new Scene(context, { rolling: { duration: 10 } }, mixer);

  scene.connect({ speed$ });
  speed$.next(0);
  speed$.next(11);
  speed$.next(44);

  const [source] = context.sources;
  const [gain] = context.gains;
  assert.equal(source.started, true);
  assert.equal(source.playbackRate.value, 2 ** (-17 / 1200));
  assert.deepEqual(gain.gain.targets, [
    { target: 0, startTime: 4, timeConstant: 0.12 },
    { target: 0.14 / Math.sqrt(8), startTime: 4, timeConstant: 0.12 },
    { target: 0.28 / Math.sqrt(8), startTime: 4, timeConstant: 0.12 },
  ]);
});

test('Scene stops observing speed when disposed', () => {
  const context = audioContext();
  const speed$ = new Subject();
  const mixer = {
    inputs: { rolling: audioNode() },
    dispose() {},
  };
  const scene = new Scene(context, { rolling: { duration: 10 } }, mixer);

  scene.connect({ speed$ });
  speed$.next(11);
  scene.dispose();
  speed$.next(22);

  const [gain] = context.gains;
  assert.deepEqual(gain.gain.targets, [
    { target: 0.14 / Math.sqrt(8), startTime: 4, timeConstant: 0.12 },
  ]);
});

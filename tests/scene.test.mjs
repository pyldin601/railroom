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
        start() {
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

test('Scene routes its Rolling source through the rolling mixer channel', () => {
  const context = audioContext();
  const buffer = {};
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
  assert.equal(source.playbackRate.value, 1);
  assert.equal(source.started, true);
  assert.deepEqual(source.connections, [gain]);
  assert.deepEqual(gain.connections, [rollingInput]);

  scene.dispose();
  assert.equal(source.stopped, true);
  assert.equal(source.disconnected, true);
  assert.equal(gain.disconnected, true);
  assert.equal(mixer.disposed, true);
});

test('Scene starts rolling and maps speed to its gain', () => {
  const context = audioContext();
  const speed$ = new Subject();
  const mixer = {
    inputs: { rolling: audioNode() },
    dispose() {},
  };
  const scene = new Scene(context, { rolling: {} }, mixer);

  scene.connect({ speed$ });
  speed$.next(0);
  speed$.next(11);
  speed$.next(44);

  const [source] = context.sources;
  const [gain] = context.gains;
  assert.equal(source.started, true);
  assert.equal(source.playbackRate.value, 1);
  assert.deepEqual(gain.gain.targets, [
    { target: 0, startTime: 4, timeConstant: 0.12 },
    { target: 0.14, startTime: 4, timeConstant: 0.12 },
    { target: 0.28, startTime: 4, timeConstant: 0.12 },
  ]);
});

test('Scene stops observing speed when disposed', () => {
  const context = audioContext();
  const speed$ = new Subject();
  const mixer = {
    inputs: { rolling: audioNode() },
    dispose() {},
  };
  const scene = new Scene(context, { rolling: {} }, mixer);

  scene.connect({ speed$ });
  speed$.next(11);
  scene.dispose();
  speed$.next(22);

  const [gain] = context.gains;
  assert.deepEqual(gain.gain.targets, [{ target: 0.14, startTime: 4, timeConstant: 0.12 }]);
});

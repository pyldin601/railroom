import assert from 'node:assert/strict';
import test from 'node:test';
import { Rolling } from '../src/audio/rolling.ts';
import { Scene } from '../src/audio/scene.ts';

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
    sources: [],
    createBufferSource() {
      const source = audioNode({
        buffer: null,
        loop: false,
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
  assert.equal(source.buffer, buffer);
  assert.equal(source.loop, true);
  assert.equal(source.started, true);
  assert.deepEqual(source.connections, [rollingInput]);

  scene.dispose();
  assert.equal(source.stopped, true);
  assert.equal(source.disconnected, true);
  assert.equal(mixer.disposed, true);
});

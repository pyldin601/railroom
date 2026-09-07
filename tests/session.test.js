import test from 'node:test';
import assert from 'node:assert/strict';
import { TrainSession } from '../src/session.js';
import { RouteIndex, demoRoute, wheelsets } from '../src/route/route-index.js';

// Audio nodes are the external boundary; route and transport remain real.
function setup(loadBank = async () => ({})) {
  const context = { currentTime: 0, state: 'running', resume: async () => {} };
  const mixers = [],
    engines = [];
  const session = new TrainSession({
    createContext: () => context,
    loadBank,
    createMixer: () => {
      const mixer = {
        master: { gain: { value: 1 } },
        levels: {},
        silences: 0,
        disposed: false,
        setListener() {},
        setSpatial() {},
        hit() {},
        horn() {},
        power() {},
        cancelFrom() {},
        silence() {
          this.silences++;
        },
        dispose() {
          this.disposed = true;
        },
      };
      mixers.push(mixer);
      return mixer;
    },
    createEngine: () => {
      const engine = {
        started: false,
        start() {
          this.started = true;
        },
        stop() {
          this.started = false;
        },
        update() {},
      };
      engines.push(engine);
      return engine;
    },
  });
  const options = {
    route: new RouteIndex(demoRoute()),
    axles: wheelsets(1),
    position: 100,
    controls: { throttle: 0.5 },
    settings: { seat: 10.7 },
  };
  return { session, context, mixers, engines, options };
}

test('rebuilding a session pauses the old transport and keeps its sink bound to old audio', async () => {
  const x = setup();
  await x.session.enable(x.options);
  x.session.start();
  const previous = x.session.transport;
  x.session.configure({ ...x.options, position: 350 });
  assert.equal(previous.running, false);
  assert.equal(x.engines[0].started, false);
  assert.equal(x.mixers[0].disposed, true);
  x.session.start();
  const silences = x.mixers[1].silences;
  previous.pause();
  assert.equal(x.mixers[1].silences, silences, 'old cancellation must not silence the new graph');
  assert.equal(x.engines[1].started, true);
  assert.equal(x.session.transport.snapshot().position, 350);
});

test('a failed sound-pack load can be retried without a half-initialized session', async () => {
  let attempts = 0;
  const x = setup(async () => {
    if (++attempts === 1) throw Error('recording unavailable');
    return {};
  });
  await assert.rejects(x.session.enable(x.options), /recording unavailable/);
  assert.equal(x.session.bank, undefined);
  await x.session.enable(x.options);
  assert.ok(x.session.transport);
  assert.equal(attempts, 2);
});

test('audio interruption pauses both transport and continuous sources', async () => {
  const x = setup();
  await x.session.enable(x.options);
  x.session.start();
  x.context.state = 'suspended';
  assert.equal(x.session.tick(), 'audio interrupted');
  assert.equal(x.session.transport.running, false);
  assert.equal(x.engines[0].started, false);
});

test('initial loading applies the latest route, consist, position and mix settings', async () => {
  let completeLoad;
  const loaded = new Promise((resolve) => {
    completeLoad = resolve;
  });
  const x = setup(() => loaded);
  let latest = x.options;
  const enabled = x.session.enable(() => latest);
  latest = {
    ...x.options,
    position: 23000,
    axles: wheelsets(10),
    settings: { master: 0, seat: 117.484 },
  };
  completeLoad({});
  await enabled;
  assert.equal(x.session.transport.snapshot().position, 23000);
  assert.equal(x.session.transport.axles.length, 40);
  assert.equal(x.session.mixer.master.gain.value, 0);
});

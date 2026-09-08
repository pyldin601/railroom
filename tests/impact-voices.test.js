import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialMixer, MAX_IMPACT_VOICES } from '../src/audio/spatial-mixer.js';
import { Transport } from '../src/audio/scheduler.js';
import { wheelsets, RouteIndex, demoRoute } from '../src/route/route-index.js';
import { virtualAudioContext } from './helpers/virtual-audio-context.js';

function fixture() {
  const context = virtualAudioContext();
  const sample = {
    buffer: context.createBuffer(1, 48000, 48000),
    gain: 0.75,
    onset: 0.01,
  };
  const axles = wheelsets(10);
  const mixer = new SpatialMixer(context, { select: () => sample }, axles);
  mixer.setListener(108.7, 0);
  return { context, axles, mixer };
}

test('maximum-speed 12.5 m joint scheduling preserves new contacts and occupied-carriage tails', () => {
  const { context, axles, mixer } = fixture();
  const localSources = [];
  let attempted = 0,
    dropped = 0,
    localDropped = 0,
    maximum = 0;
  const route = demoRoute();
  route.events = route.events.map((event) => ({ ...event, position: event.position / 2 }));
  const transport = new Transport({
    clock: () => context.currentTime,
    route: new RouteIndex(route),
    axles,
    vehicle: { maxSpeed: 100, resistance: 0, drag: 0, jerk: Infinity },
    sink: {
      hit(event, when, generation) {
        attempted++;
        const before = context.createdSources.length;
        mixer.hit(event, when, generation);
        const local = event.wheelsetId.startsWith('c5-');
        if (mixer.lastImpacts.get(`${event.wheelsetId}:${event.side}`) !== when) {
          dropped++;
          if (local) localDropped++;
        }
        if (local) localSources.push(...context.createdSources.slice(before));
        maximum = Math.max(maximum, mixer.voices.size);
      },
      cancelFrom: (time) => mixer.cancelFrom(time),
      silence: () => mixer.silence(),
    },
  });
  transport.state.position = 1000;
  transport.state.speed = 100;
  transport.start();
  for (let tick = 1; tick <= 400; tick++) {
    context.advance(tick * 0.025);
    transport.tick();
    assert.ok(
      context.sources.size <= MAX_IMPACT_VOICES * 2,
      'retiring fades do not create an unbounded source backlog',
    );
  }
  assert.ok(attempted > 6400, 'exercise sustained traffic beyond the initial tail lifetime');
  assert.equal(transport.underruns, 0);
  assert.equal(localDropped, 0, 'occupied wheels must retain every clack');
  assert.equal(dropped, 0, 'quiet old tails should free capacity for every new contact');
  assert.ok(maximum <= MAX_IMPACT_VOICES, 'tracked groups stay within the CPU budget');
  assert.ok(
    localSources.every((source) => source.stopTime >= source.naturalEnd),
    'occupied-carriage clacks and metal tails finish naturally',
  );
  context.advance(12);
  assert.equal(mixer.voices.size, 0);
  assert.equal(context.sources.size, 0);
});

test('saturation reclaims old external metal without canceling local or upcoming clacks', () => {
  const { context, mixer } = fixture();
  const event = (wheelsetId, position) => ({
    kind: 'joint',
    wheelsetId,
    side: 'left',
    position,
    speedMps: 100,
    objectId: `contact-${position}`,
  });
  mixer.hit(event('c5-a1', 3), 0.02, 1);
  const local = [...mixer.voices][0];
  for (let index = 1; index < MAX_IMPACT_VOICES; index++) {
    mixer.hit(event('c10-a1', 3), 0.02 + index * 0.0001, 1);
  }
  const oldestExternal = [...mixer.voices][1];
  const newContact = event('c5-a2', 3);
  mixer.hit(newContact, 0.2, 1);
  assert.equal(
    mixer.lastImpacts.has('c5-a2:left'),
    false,
    'a synthetic instantaneous burst cannot steal upcoming clacks',
  );
  context.advance(1.1);
  mixer.hit(newContact, 1.2, 1);
  assert.equal(mixer.lastImpacts.get('c5-a2:left'), 1.2);
  assert.ok(mixer.voices.has(local), 'local tail is protected');
  assert.ok(!mixer.voices.has(oldestExternal), 'old external tail is reclaimed first');
  assert.ok(oldestExternal.metalSource.stopTime <= 1.12, 'stolen tail has a short fade');
  assert.equal(local.metalSource.stopTime > local.metalSource.naturalEnd, true);
  assert.ok(mixer.voices.size <= MAX_IMPACT_VOICES);
});

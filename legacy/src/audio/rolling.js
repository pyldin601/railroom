import { impactDistance } from './impact-distance.js?v=louder-neighbours';
import { listenerSeat } from '../route/route-index.js';
import { splitRolling, updateRollingBands, disposeRollingBands } from './rolling-bands.js';
// Fixed, irregular cents offsets: centred overall, with no speed-driven pitch shift.
import { ROLLING_TUNING as TUNING } from './settings.js';
const WHEEL_CENTS = TUNING.wheelCents;
export function rollingWheels(axles, occupied = 1) {
  return axles
    .filter((a) => (a.car ?? 1) === occupied)
    .flatMap((a) => ['left', 'right'].map((side) => ({ axle: a, side })))
    .map((w, i) => ({
      ...w,
      offset: (i * TUNING.phaseStep) % 1,
      rate: 2 ** (WHEEL_CENTS[i % WHEEL_CENTS.length] / 1200),
    }));
}
/** Occupied-carriage recorded rolling feeds and their band/distance envelopes. */
export class RollingLayers {
  constructor(context, bank, mixer) {
    Object.assign(this, { context, bank, mixer });
    this.layers = [];
    this.started = false;
  }
  start() {
    if (this.started) return;
    this.started = true;
    for (const kind of ['rolling', 'idle', 'air']) {
      const pool = this.bank.pool(kind);
      if (!pool.length) continue;
      const audible = this.mixer.audibleAxles ?? this.mixer.axles;
      const local = audible.find((a) => a.car === this.mixer.occupied) ?? audible[0];
      const feeds =
        kind === 'rolling'
          ? rollingWheels(audible, this.mixer.occupied ?? 1)
          : [{ axle: local, side: 'center', offset: 0, rate: 1 }];
      for (const [i, feed] of feeds.entries()) {
        const { axle, side } = feed;
        const sample = pool[i % pool.length],
          source = this.context.createBufferSource(),
          gain = this.context.createGain(),
          fade = this.context.createGain();
        source.buffer = sample.buffer;
        source.playbackRate.value = feed.rate;
        source.loop = true;
        source.loopStart = sample.loopStart || 0;
        source.loopEnd = sample.loopEnd || sample.buffer.duration;
        gain.gain.value = 0;
        const bands = kind === 'rolling' ? splitRolling(this.context, source, gain) : {};
        if (kind !== 'rolling') source.connect(gain);
        gain.connect(fade).connect(this.mixer.emitters.get(`${axle.id}:${side}`).gain);
        source.start(0, source.loopStart + (source.loopEnd - source.loopStart) * feed.offset);
        this.layers.push({
          bands,
          kind,
          source,
          gain,
          fade,
          sample,
          axle,
          wheelsetId: axle.id,
          side,
          rate: feed.rate,
        });
      }
    }
  }
  update(state, controls, running) {
    if (!this.started) return;
    const speed = state.speed,
      t = this.context.currentTime;
    for (const layer of this.layers) {
      let level = 0;
      if (running) {
        if (layer.kind === 'rolling')
          level =
            (((Math.min(1, speed / TUNING.fullLevelSpeed) * TUNING.amplitude) /
              Math.sqrt((this.mixer.audibleAxles ?? this.mixer.axles).length / 4)) *
              this.mixer.levels.rolling) /
            Math.sqrt(2);
        if (layer.kind === 'idle') level = 0.025;
        if (layer.kind === 'air') level = Math.min(1, speed / 33) * 0.045;
      }
      if (layer.kind === 'rolling')
        level *= impactDistance(
          layer.axle,
          this.mixer.seat ?? listenerSeat(this.mixer.axles.length / 4),
          this.mixer.occupied ?? 1,
          layer.side,
        ).metal;
      updateRollingBands(layer.bands, this.mixer.levels, t);
      layer.gain.gain.setTargetAtTime(level * (layer.sample.gain ?? 1), t, TUNING.gainSmoothing);
    }
  }
  stop(at = this.context.currentTime) {
    for (const l of this.layers) {
      l.fade.gain.setValueAtTime(1, at);
      l.fade.gain.linearRampToValueAtTime(0, at + TUNING.stopFade);
      l.source.onended = () => {
        l.source.disconnect();
        disposeRollingBands(l.bands);
        l.gain.disconnect();
        l.fade.disconnect();
      };
      l.source.stop(at + TUNING.stopTail);
    }
    this.layers = [];
    this.started = false;
  }
}

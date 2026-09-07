// Hold a local motor texture, not the recording's entire acceleration ramp.
const DURATION = .18;
const HOP = .06;
export const grainWindow = phase => phase <= 0 || phase >= 1 ? 0 : (1 - Math.cos(2 * Math.PI * phase)) / 3;
export function recordedPitchRate(speed) {
  return .68 + 1.12 * Math.min(1, Math.max(0, speed) / (120 / 3.6));
}
export function sourcePosition(_speed, duration) {
  // Hold the motor-dominated section. Scanning the old clip exposed hiss and inverter transitions.
  return Math.max(0, Math.min(.3, duration - DURATION * 1.8 - .03));
}

/** Match overlapping waveform phase locally to reduce granular flutter. */
export function alignGrain(data, sampleRate, desired, previous, playbackRate = 1) {
  if (previous == null) return desired;
  const target = Math.round(desired * sampleRate);
  const reference = Math.round((previous + HOP * playbackRate) * sampleRate);
  const limit = data.length - Math.ceil(DURATION * playbackRate * sampleRate) - 1;
  let best = Math.max(0, Math.min(limit, target)), score = -Infinity;
  const radius = Math.floor(.006 * sampleRate);
  for (let candidate = Math.max(0, target - radius); candidate <= Math.min(limit, target + radius); candidate += 4) {
    let dot = 0, energy = 0, refEnergy = 0;
    for (let i = 0; i < 512; i += 8) {
      const a = data[candidate + i] || 0, b = data[reference + i] || 0;
      dot += a * b; energy += a * a; refEnergy += b * b;
    }
    const correlation = dot / Math.sqrt(energy * refEnergy + 1e-20);
    if (correlation > score) { score = correlation; best = candidate; }
  }
  return best / sampleRate;
}

export function textureNormalization(data, sampleRate, offset) {
  const start = Math.floor(offset * sampleRate), end = Math.min(data.length, start + DURATION * sampleRate);
  let energy = 0, count = 0;
  for (let i = start; i < end; i += 8) {energy += data[i] * data[i];count++;}
  return Math.max(.5, Math.min(4, .1 / Math.sqrt(energy / Math.max(1, count) + 1e-12)));
}

export class RecordedMotor {
  constructor(context, bank, mixer, profile = {}) {
    Object.assign(this, {context, bank, mixer, profile});
    this.voices = []; this.started = false;
    this.window = Float32Array.from({length:193}, (_, i) => grainWindow(i / 192));
  }
  start() {
    if (this.started) return;
    this.sample = this.bank.pool(this.profile.kind??'traction')[0];
    if (!this.sample) return;
    this.started = true;
    const axles=this.mixer.audibleAxles??this.mixer.axles;
    const bogies = this.profile.axles?this.profile.axles(axles):axles.filter((_, i) => i % 4 === 0 || i % 4 === 2);
    this.voices = bogies.map((axle, i) => {
      const output = this.context.createGain(), fade = this.context.createGain();
      output.gain.value = 0;
      output.connect(fade).connect(this.mixer.emitters.get(`${axle.id}:center`).gain);
      return {output, fade, nextTime:this.context.currentTime + .015 + i * .002, sources:new Set(), previous:null, rate:null, lastUpdate:null, index:i};
    });
  }
  update(state, controls, running) {
    if (!this.started) return;
    const now = this.context.currentTime;
    const parameters=this.profile.parameters?.(state,controls,running);
    const load = parameters?parameters.load:running && !controls.brake && !controls.emergency ? Math.max(0, Math.min(1, controls.throttle || 0)) : 0;
    const gain = Math.pow(load, .75) * (this.profile.gain??.19) * (this.mixer.levels[this.profile.level??'traction'] ?? 1) / Math.sqrt(this.voices.length);
    const buffer = this.sample.buffer, data = buffer.getChannelData(0);
    for (const voice of this.voices) {
      voice.output.gain.setTargetAtTime(gain, now, .12);
      if(this.profile.lazy&&load===0){voice.rate=null;voice.previous=null;voice.nextTime=now+.015;continue;}
      const targetRate = parameters?.rate??recordedPitchRate(state.speed);
      const dt = Math.max(0, now - (voice.lastUpdate ?? now));
      voice.rate = voice.rate == null ? targetRate : voice.rate + (targetRate - voice.rate) * (1 - Math.exp(-dt / .18));
      voice.lastUpdate = now;
      if (voice.nextTime < now) {voice.nextTime = now + .01; voice.previous = null;}
      while (voice.nextTime < now + .15) {
        const desired = this.profile.offset?this.profile.offset(voice,buffer.duration):sourcePosition(state.speed, buffer.duration);
        const offset = this.profile.align===false?desired:alignGrain(data, buffer.sampleRate, desired, voice.previous, voice.rate);
        const source = this.context.createBufferSource(), envelope = this.context.createGain();
        source.buffer = buffer;
        source.playbackRate.value = voice.rate;
        const normalizer = textureNormalization(data, buffer.sampleRate, offset);
        envelope.gain.setValueCurveAtTime(this.window.map(v => v * normalizer), voice.nextTime, DURATION);
        source.connect(envelope).connect(voice.output);
        voice.sources.add(source);
        source.onended = () => {
          source.disconnect(); envelope.disconnect(); voice.sources.delete(source);
          if (voice.stopping && !voice.sources.size) {voice.output.disconnect();voice.fade.disconnect();}
        };
        source.start(voice.nextTime, offset, DURATION * voice.rate);
        voice.previous = offset; voice.nextTime += HOP;
      }
    }
  }
  stop(at = this.context.currentTime) {
    for (const voice of this.voices) {
      voice.stopping = true;
      voice.fade.gain.setValueAtTime(1, at); voice.fade.gain.linearRampToValueAtTime(0, at + .03);
      for (const source of voice.sources) source.stop(at + .035);
      if (!voice.sources.size) {voice.output.disconnect();voice.fade.disconnect();}
    }
    this.voices = []; this.started = false;
  }
}

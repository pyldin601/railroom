/** A generic electric drive: continuous phase, load-dependent FM and gear harmonics.
 * Frequencies are sound-design values, not a model of a named locomotive.
 */
export function motorParameters(speed, throttle, braking = 0) {
  const v = Math.max(0, Math.min(40, speed));
  const load = braking ? 0 : Math.max(0, Math.min(1, throttle));
  return {
    electrical: 32 + v * 10.8,
    gear: 105 + v * 24,
    body: 26 + v * 3.8,
    deviation: (10 + v * 1.4) * (.2 + load * .8),
    cutoff: 650 + v * 24 + load * 350,
    gain: Math.pow(load, .75) * (.065 + .025 * Math.min(1, v / 12)),
  };
}

export class TractionMotor {
  constructor(context, mixer) {
    this.context = context;
    this.mixer = mixer;
    this.voices = [];
    this.started = false;
  }

  start() {
    if (this.started) return;
    this.started = true;
    const ctx = this.context;
    const wave = ctx.createPeriodicWave(new Float32Array(5), new Float32Array([0, 1, .22, .075, .025]));
    // Two independently voiced bogies per carriage; existing spatial buses handle seats and solos.
    const bogies = this.mixer.axles.filter((_, i) => i % 4 === 0 || i % 4 === 2);
    for (const [i, axle] of bogies.entries()) {
      const carrier = ctx.createOscillator(), modulator = ctx.createOscillator();
      const gear = ctx.createOscillator(), body = ctx.createOscillator(), drift = ctx.createOscillator();
      carrier.setPeriodicWave(wave);
      gear.setPeriodicWave(wave);
      const deviation = ctx.createGain(), gearLevel = ctx.createGain(), bodyLevel = ctx.createGain();
      const driftDepth = ctx.createGain(), filter = ctx.createBiquadFilter();
      const gain = ctx.createGain(), fade = ctx.createGain();
      gearLevel.gain.value = .15;
      bodyLevel.gain.value = .32;
      driftDepth.gain.value = .65; // cents: subtle independent motor beating, not a vibrato effect
      drift.frequency.value = .173 + i * .037;
      filter.type = 'lowpass'; filter.Q.value = .55;
      gain.gain.value = 0;
      modulator.connect(deviation).connect(carrier.frequency);
      drift.connect(driftDepth).connect(carrier.detune);
      carrier.connect(filter);
      gear.connect(gearLevel).connect(filter);
      body.connect(bodyLevel).connect(filter);
      filter.connect(gain).connect(fade).connect(this.mixer.emitters.get(`${axle.id}:center`).gain);
      const oscillators = [carrier, modulator, gear, body, drift];
      const nodes = [...oscillators, deviation, gearLevel, bodyLevel, driftDepth, filter, gain, fade];
      const voice = {carrier, modulator, gear, body, deviation, filter, gain, fade, oscillators, nodes, detune: 1 + i * .0013};
      this.voices.push(voice);
      this.tune(voice, motorParameters(0, 0), ctx.currentTime, bogies.length);
      for (const oscillator of oscillators) oscillator.start();
    }
  }

  tune(voice, p, time, count) {
    const smooth = (param, value, seconds = .09) => param.setTargetAtTime(value, time, seconds);
    smooth(voice.carrier.frequency, p.electrical * voice.detune);
    smooth(voice.modulator.frequency, p.electrical * 2.013 * voice.detune);
    smooth(voice.gear.frequency, p.gear * voice.detune);
    smooth(voice.body.frequency, p.body * voice.detune);
    smooth(voice.deviation.gain, p.deviation, .16);
    smooth(voice.filter.frequency, p.cutoff, .18);
    smooth(voice.gain.gain, p.gain * (this.mixer.levels.traction ?? 1) / Math.sqrt(count), .12);
  }

  update(state, controls, running) {
    if (!this.started) return;
    const p = motorParameters(state.speed, running ? controls.throttle || 0 : 0, controls.brake || controls.emergency);
    for (const voice of this.voices) this.tune(voice, p, this.context.currentTime, this.voices.length);
  }

  stop(at = this.context.currentTime) {
    for (const voice of this.voices) {
      voice.fade.gain.setValueAtTime(1, at);
      voice.fade.gain.linearRampToValueAtTime(0, at + .03);
      voice.oscillators.at(-1).onended = () => { for (const node of voice.nodes) node.disconnect(); };
      for (const oscillator of voice.oscillators) oscillator.stop(at + .035);
    }
    this.voices = [];
    this.started = false;
  }
}

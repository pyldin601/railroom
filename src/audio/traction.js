import {PWM_CARRIERS,pwmParameters} from './pwm.js?v=taurus-quiet';
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
    const bogies = (this.mixer.audibleAxles??this.mixer.axles).filter((_, i) => i % 4 === 0 || i % 4 === 2);
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
      filter.connect(gain).connect(fade).connect(this.mixer.locomotive?.input??this.mixer.emitters.get(`${axle.id}:center`).gain);
      // Two alternating voices crossfade held notes without fourteen running oscillators.
      const pwmMod=ctx.createOscillator(),pwmDepth=ctx.createGain(),pwmGain=ctx.createGain();
      pwmMod.frequency.value=24;pwmDepth.gain.value=35;pwmGain.gain.value=0;
      pwmMod.connect(pwmDepth);pwmGain.connect(fade);
      const pwmBands=[PWM_CARRIERS[0],PWM_CARRIERS[0]].map(frequency=>{
        const oscillator=ctx.createOscillator(),level=ctx.createGain();
        oscillator.setPeriodicWave(wave);oscillator.frequency.value=frequency;level.gain.value=0;
        pwmDepth.connect(oscillator.frequency);oscillator.connect(level).connect(pwmGain);
        return {oscillator,level};
      });
      const oscillators = [carrier, modulator, gear, body, ...pwmBands.map(b=>b.oscillator), pwmMod, drift];
      const nodes = [...oscillators, pwmDepth,pwmGain,...pwmBands.map(b=>b.level), deviation, gearLevel, bodyLevel, driftDepth, filter, gain, fade];
      const voice = {pwmMod,pwmDepth,pwmGain,pwmBands,carrier, modulator, gear, body, deviation, filter, gain, fade, oscillators, nodes, needsInitialTune: true, detune: 1 + i * .0013};
      this.voices.push(voice);
      this.tune(voice, motorParameters(0, 0), ctx.currentTime, bogies.length, true);
      for (const oscillator of oscillators) oscillator.start();
    }
  }

  tune(voice, p, time, count, immediate = false) {
    // Set pitch before sound becomes audible; smooth only subsequent changes.
    const smooth = (param, value, seconds = .09) => immediate ? param.setValueAtTime(value, time) : param.setTargetAtTime(value, time, seconds);
    smooth(voice.carrier.frequency, p.electrical * voice.detune);
    smooth(voice.modulator.frequency, p.electrical * 2.013 * voice.detune);
    smooth(voice.gear.frequency, p.gear * voice.detune);
    smooth(voice.body.frequency, p.body * voice.detune);
    smooth(voice.deviation.gain, p.deviation, .16);
    smooth(voice.filter.frequency, p.cutoff, .18);
    voice.gain.gain.setTargetAtTime(p.gain * (this.mixer.levels.traction ?? 1) / Math.sqrt(count), time, .12);
  }

  update(state, controls, running) {
    if (!this.started) return;
    const p = motorParameters(state.speed, running ? controls.throttle || 0 : 0, controls.brake || controls.emergency);
    const pwm=pwmParameters(state.speed,controls,running,this.pwmStage);this.pwmStage=pwm.stage;
    for (const voice of this.voices) {
      const t=this.context.currentTime;
      const tune=(param,value)=>voice.needsInitialTune?param.setValueAtTime(value,t):param.setTargetAtTime(value,t,.08);
      tune(voice.pwmMod.frequency,pwm.electrical);
      tune(voice.pwmDepth.gain,pwm.deviation);
      if(voice.pwmStage!==pwm.stage){
        voice.pwmActive=voice.pwmActive===0?1:0;
        voice.pwmBands[voice.pwmActive].oscillator.frequency.setValueAtTime(PWM_CARRIERS[pwm.stage],t);
        voice.pwmBands.forEach((band,i)=>band.level.gain.setTargetAtTime(i===voice.pwmActive?1:0,t,.012));
        voice.pwmStage=pwm.stage;
      }
      voice.pwmGain.gain.setTargetAtTime(pwm.gain*(this.mixer.levels[pwm.braking?'brake':'traction']??1)/Math.sqrt(this.voices.length),t,.12);
      this.tune(voice, p, this.context.currentTime, this.voices.length, voice.needsInitialTune);
      voice.needsInitialTune = false;
    }
  }

  stop(at = this.context.currentTime) {
    for (const voice of this.voices) {
      voice.fade.gain.setValueAtTime(1, at);
      voice.fade.gain.linearRampToValueAtTime(0, at + .03);
      voice.oscillators.at(-1).onended = () => { for (const node of voice.nodes) node.disconnect(); };
      for (const oscillator of voice.oscillators) oscillator.stop(at + .035);
    }
    this.voices = [];
    this.pwmStage=undefined;
    this.started = false;
  }
}

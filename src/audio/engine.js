import { RollingLayers } from './rolling.js?v=review-fixes';
import { PneumaticAudio } from './pneumatic.js?v=release-tail';
import { CabinAmbience } from './ambient.js';
import { BrakingLayers } from './braking.js?v=pneumatic';
import { RecordedMotor } from './recorded-motor.js?v=brake-grains';
import { TractionMotor } from './traction.js?v=locomotive-space';

/** Owns the lifecycle of continuous sounds; the mixer owns spatial buses/impacts. */
export class AudioEngine {
  constructor(context, bank, mixer) {
    Object.assign(this, { context, mixer });
    this.rolling = new RollingLayers(context, bank, mixer);
    this.pneumatic = new PneumaticAudio(context, mixer);
    this.ambient = new CabinAmbience(context, mixer);
    this.motor = new TractionMotor(context, mixer);
    this.recordedMotor = new RecordedMotor(context, bank, mixer);
    this.braking = new BrakingLayers(context, bank, mixer);
    this.continuous = [this.rolling, this.pneumatic, this.ambient, this.braking];
    this.started = false;
  }

  start() {
    if (this.started) return;
    this.started = true;
    (this.mixer.motorMode === 'recorded' ? this.recordedMotor : this.motor).start();
    for (const layer of this.continuous) layer.start();
  }

  update(state, controls, running) {
    if (!this.started) return;
    for (const layer of this.continuous) layer.update(state, controls, running);
    const powered = running && controls.powerAvailable !== false;
    const motorControls = {
      ...controls,
      throttle: state.air?.cylinder > 0.02 ? 0 : controls.throttle,
    };
    this.motor.update(state, motorControls, powered);
    this.recordedMotor.update(state, motorControls, powered);
  }

  setMotorMode(mode) {
    this.motor.stop();
    this.recordedMotor.stop();
    this.mixer.motorMode = mode;
    if (this.started) (mode === 'recorded' ? this.recordedMotor : this.motor).start();
  }

  stop(at = this.context.currentTime) {
    for (const layer of [...this.continuous, this.motor, this.recordedMotor]) layer.stop(at);
    this.started = false;
  }
}

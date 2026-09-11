import { clamp } from '../core/helpers.ts';

const FULL_LEVEL_SPEED = 22;
const MAXIMUM_LEVEL = 0.28;
const GAIN_SMOOTHING = 0.12;
const WHEEL_CENTS = [-17, 7, 15, -8, 11, -14, -4, 10];
const PHASE_STEP = 0.371;
const CROSSOVER_HZ = 500;

/** Eight rolling loops for the occupied carriage's four axles, left and right. */
export class Rolling {
  private readonly context: BaseAudioContext;
  private readonly buffer: AudioBuffer;
  private readonly destination: AudioNode;
  private readonly gain: GainNode;
  private readonly sources: AudioBufferSourceNode[] = [];
  private readonly filters: BiquadFilterNode[] = [];

  constructor(context: BaseAudioContext, buffer: AudioBuffer, destination: AudioNode) {
    this.context = context;
    this.buffer = buffer;
    this.destination = destination;
    this.gain = context.createGain();
    this.gain.gain.value = 0;
  }

  start() {
    if (this.sources.length) {
      return;
    }

    this.gain.connect(this.destination);
    const startTime = this.context.currentTime;
    for (const [index, cents] of WHEEL_CENTS.entries()) {
      const source = this.context.createBufferSource();
      source.buffer = this.buffer;
      source.loop = true;
      source.playbackRate.value = 2 ** (cents / 1200);

      // Legacy fourth-order Linkwitz–Riley low/high split for each wheel.
      for (const type of ['lowpass', 'highpass'] as const) {
        const first = this.context.createBiquadFilter();
        const second = this.context.createBiquadFilter();
        for (const filter of [first, second]) {
          filter.type = type;
          filter.frequency.value = CROSSOVER_HZ;
          filter.Q.value = 20 * Math.log10(Math.SQRT1_2);
          this.filters.push(filter);
        }
        source.connect(first).connect(second).connect(this.gain);
      }

      source.start(startTime, ((index * PHASE_STEP) % 1) * this.buffer.duration);
      this.sources.push(source);
    }
  }

  setSpeed(speed: number) {
    const level =
      (clamp(speed / FULL_LEVEL_SPEED, 0, 1) * MAXIMUM_LEVEL) / Math.sqrt(WHEEL_CENTS.length);
    this.gain.gain.setTargetAtTime(level, this.context.currentTime, GAIN_SMOOTHING);
  }

  dispose() {
    if (!this.sources.length) {
      return;
    }

    for (const source of this.sources) {
      source.stop();
      source.disconnect();
    }
    for (const filter of this.filters) {
      filter.disconnect();
    }
    this.gain.disconnect();
    this.sources.length = 0;
    this.filters.length = 0;
  }
}

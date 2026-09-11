import { clamp } from '../core/helpers.ts';

const FULL_LEVEL_SPEED = 22;
const MAXIMUM_LEVEL = 0.28;
const GAIN_SMOOTHING = 0.12;

/** Owns the continuous rolling loop. Playback is started explicitly. */
export class Rolling {
  private readonly context: BaseAudioContext;
  private readonly buffer: AudioBuffer;
  private readonly destination: AudioNode;
  private readonly gain: GainNode;
  private source: AudioBufferSourceNode | undefined;

  constructor(context: BaseAudioContext, buffer: AudioBuffer, destination: AudioNode) {
    this.context = context;
    this.buffer = buffer;
    this.destination = destination;
    this.gain = context.createGain();
    this.gain.gain.value = 0;
  }

  start() {
    if (this.source) {
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.loop = true;
    source.connect(this.gain).connect(this.destination);
    source.start();
    this.source = source;
  }

  setSpeed(speed: number) {
    const level = clamp(speed / FULL_LEVEL_SPEED, 0, 1) * MAXIMUM_LEVEL;
    this.gain.gain.setTargetAtTime(level, this.context.currentTime, GAIN_SMOOTHING);
  }

  dispose() {
    if (!this.source) {
      return;
    }

    this.source.stop();
    this.source.disconnect();
    this.gain.disconnect();
    this.source = undefined;
  }
}

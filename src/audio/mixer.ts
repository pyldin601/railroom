import { clamp } from '../core/helpers';

export enum MixerChannel {
  Impacts = 'impacts',
  Rolling = 'rolling',
  Traction = 'traction',
  Braking = 'braking',
  Horn = 'horn',
  Ambient = 'ambient',
}

/** Mixes named sound inputs; the caller owns the context and connected sources. */
export class Mixer {
  /** Connect source or spatial outputs here. All channels start at unity gain. */
  readonly inputs: Readonly<Record<MixerChannel, GainNode>>;

  private readonly master: GainNode;
  private readonly compressor: DynamicsCompressorNode;
  private readonly analyser: AnalyserNode;
  private readonly meterData: Float32Array<ArrayBuffer>;

  constructor(
    private readonly context: BaseAudioContext,
    destination: AudioNode = context.destination,
  ) {
    this.inputs = {
      [MixerChannel.Impacts]: context.createGain(),
      [MixerChannel.Rolling]: context.createGain(),
      [MixerChannel.Traction]: context.createGain(),
      [MixerChannel.Braking]: context.createGain(),
      [MixerChannel.Horn]: context.createGain(),
      [MixerChannel.Ambient]: context.createGain(),
    };
    this.master = context.createGain();
    this.compressor = context.createDynamicsCompressor();
    this.analyser = context.createAnalyser();

    this.compressor.threshold.value = -8;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.analyser.fftSize = 256;
    this.meterData = new Float32Array(this.analyser.fftSize);

    for (const input of Object.values(this.inputs)) {
      input.connect(this.master);
    }

    this.master.connect(this.compressor).connect(this.analyser).connect(destination);
  }

  /** Set channel volume from 0 (silent) to 1 (unity), with a smooth transition. */
  setLevel(channel: MixerChannel, value: number) {
    this.setGain(this.inputs[channel].gain, value);
  }

  /** Set master volume from 0 (silent) to 1 (unity), with a smooth transition. */
  setMasterLevel(value: number) {
    this.setGain(this.master.gain, value);
  }

  /** Read the post-compressor waveform peak for a UI meter. */
  getPeak() {
    this.analyser.getFloatTimeDomainData(this.meterData);
    let peak = 0;
    for (const sample of this.meterData) {
      peak = Math.max(peak, Math.abs(sample));
    }
    return peak;
  }

  /** Disconnect mixer nodes after the caller has stopped its sources. */
  dispose() {
    for (const input of Object.values(this.inputs)) {
      input.disconnect();
    }
    this.master.disconnect();
    this.compressor.disconnect();
    this.analyser.disconnect();
  }

  private setGain(parameter: AudioParam, value: number) {
    if (!Number.isFinite(value)) {
      throw new RangeError('Mixer level must be finite');
    }
    parameter.setTargetAtTime(clamp(value, 0, 1), this.context.currentTime, 0.015);
  }
}

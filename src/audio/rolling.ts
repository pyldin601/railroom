/** Owns the continuous rolling loop. Playback is started explicitly. */
export class Rolling {
  private readonly context: BaseAudioContext;
  private readonly buffer: AudioBuffer;
  private readonly destination: AudioNode;
  private source: AudioBufferSourceNode | undefined;

  constructor(context: BaseAudioContext, buffer: AudioBuffer, destination: AudioNode) {
    this.context = context;
    this.buffer = buffer;
    this.destination = destination;
  }

  start() {
    if (this.source) {
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = this.buffer;
    source.loop = true;
    source.connect(this.destination);
    source.start();
    this.source = source;
  }

  dispose() {
    if (!this.source) {
      return;
    }

    this.source.stop();
    this.source.disconnect();
    this.source = undefined;
  }
}

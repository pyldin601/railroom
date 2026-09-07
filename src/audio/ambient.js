/** Quiet, speech-free carriage air and body vibration. Generated once per context. */
const buffers = new WeakMap();
export function cabinTexture(rate = 32000, duration = 19) {
  const length = Math.round(rate * duration),
    channels = [];
  for (let channel = 0; channel < 2; channel++) {
    const data = new Float32Array(length);
    let seed = 173 + channel * 971,
      air = 0,
      body = 0;
    for (let i = 0; i < length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      air += 0.19 * (noise - air);
      body += 0.018 * (noise - body);
      const t = i / rate;
      data[i] =
        0.55 * (air - body) +
        0.7 * body +
        0.018 * Math.sin(2 * Math.PI * 95 * t + channel * 0.4) +
        0.008 * Math.sin(2 * Math.PI * 143 * t);
    }
    // Wrap a half-second equal-gain crossfade; no abrupt repeating seam.
    const overlap = Math.round(rate * 0.5),
      out = data.slice(overlap);
    for (let i = 0; i < overlap; i++) {
      const a = i / overlap;
      out[out.length - overlap + i] = data[length - overlap + i] * (1 - a) + data[i] * a;
    }
    channels.push(out);
  }
  return channels;
}
export class CabinAmbience {
  constructor(context, mixer) {
    Object.assign(this, { context, mixer });
    this.voice = null;
  }
  start() {
    if (this.voice || !this.mixer.master) return;
    const ctx = this.context;
    let buffer = buffers.get(ctx);
    if (!buffer) {
      const channels = cabinTexture();
      buffer = ctx.createBuffer(2, channels[0].length, 32000);
      channels.forEach((data, i) => buffer.getChannelData(i).set(data));
      buffers.set(ctx, buffer);
    }
    const source = ctx.createBufferSource(),
      gain = ctx.createGain(),
      fade = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain).connect(fade).connect(this.mixer.master);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      fade.disconnect();
    };
    source.start();
    this.voice = { source, gain, fade };
  }
  update(state, controls, running) {
    if (this.voice)
      this.voice.gain.gain.setTargetAtTime(
        running ? 0.065 * (this.mixer.levels.ambient ?? 0.1) : 0,
        this.context.currentTime,
        0.25,
      );
  }
  stop(at = this.context.currentTime) {
    if (!this.voice) return;
    const { source, fade } = this.voice;
    fade.gain.setValueAtTime(1, at);
    fade.gain.linearRampToValueAtTime(0, at + 0.03);
    source.stop(at + 0.035);
    this.voice = null;
  }
}

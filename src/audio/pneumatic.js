/** Continuous pressure-driven exhaust and reservoir compressor textures. */
const cache = new WeakMap();
export class PneumaticAudio {
  constructor(context, mixer) {
    Object.assign(this, { context, mixer });
    this.voices = [];
  }
  start() {
    if (this.voices.length || !this.mixer.master) return;
    const ctx = this.context;
    let buffers = cache.get(ctx);
    if (!buffers) {
      buffers = ['release', 'compressor'].map((kind) => {
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 8, ctx.sampleRate),
          d = buffer.getChannelData(0);
        let seed = 137,
          low = 0;
        for (let i = 0; i < d.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          const n = seed / 2147483648 - 1;
          low += 0.12 * (n - low);
          const t = i / ctx.sampleRate;
          d[i] =
            kind === 'release'
              ? 0.28 * (n - low)
              : 0.08 * low +
                0.09 * Math.sin(2 * Math.PI * 48 * t) +
                0.045 * Math.sin(2 * Math.PI * 96 * t) +
                0.02 * Math.sin(2 * Math.PI * 144 * t);
        }
        const overlap = Math.round(ctx.sampleRate * 0.1);
        for (let i = 0; i < overlap; i++) {
          const w = i / overlap;
          d[d.length - overlap + i] = d[d.length - overlap + i] * (1 - w) + d[i] * w;
        }
        return buffer;
      });
      cache.set(ctx, buffers);
    }
    buffers.forEach((buffer, i) => {
      const source = ctx.createBufferSource(),
        gain = ctx.createGain(),
        fade = ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopStart = 0.1;
      gain.gain.value = 0;
      const axle =
        this.mixer.axles.find((a) => a.car === (this.mixer.occupied ?? 1)) ?? this.mixer.axles[0];
      const destination =
        i === 0
          ? (this.mixer.emitters.get(`${axle.id}:center`)?.gain ?? this.mixer.master)
          : (this.mixer.locomotive?.input ?? this.mixer.master);
      source.connect(gain).connect(fade).connect(destination);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        fade.disconnect();
      };
      source.start();
      this.voices.push({ source, gain, fade });
    });
  }
  update(state, controls, running) {
    const air = state.air;
    const volume = this.mixer.levels.brake ?? 1;
    const levels =
      running && air
        ? [
            0.12 * Math.min(1, air.releaseFlow / 3) * volume,
            air.compressor && controls.powerAvailable !== false ? 0.16 * volume : 0,
          ]
        : [0, 0];
    this.voices.forEach((v, i) =>
      v.gain.gain.setTargetAtTime(levels[i], this.context.currentTime, i === 0 ? 0.12 : 0.3),
    );
  }
  stop(at = this.context.currentTime) {
    for (const { source, fade } of this.voices) {
      fade.gain.setValueAtTime(1, at);
      fade.gain.linearRampToValueAtTime(0, at + 0.03);
      source.stop(at + 0.035);
    }
    this.voices = [];
  }
}

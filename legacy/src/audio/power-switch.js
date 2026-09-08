/** Designed contactor clunk and brief pneumatic hiss; no electrical arc simulation. */
export function powerSwitchBuffer(context, on) {
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 0.24), context.sampleRate),
    data = buffer.getChannelData(0);
  let seed = on ? 381 : 917,
    noise = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / context.sampleRate;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    noise += 0.4 * (seed / 2147483648 - 1 - noise);
    const pulse = Math.exp(-t / (on ? 0.035 : 0.025));
    data[i] =
      Math.min(1, t / 0.001) *
      (0.35 * noise * Math.exp(-t / 0.045) +
        0.25 * Math.sin(2 * Math.PI * (on ? 340 : 240) * t) * pulse) *
      Math.min(1, (0.24 - t) / 0.025);
  }
  return buffer;
}

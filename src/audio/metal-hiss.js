// Same 4 kHz high-pass and Schroeder reverb as the audition: 500 ms RT60,
// 35% wet addition, no normalization. Render once per recording, not per hit.
export function metalHissSamples(input, rate) {
  const dry = new Float32Array(input.length + Math.ceil(rate * 0.6));
  const w = (2 * Math.PI * Math.min(4000, rate * 0.45)) / rate,
    c = Math.cos(w),
    alpha = Math.sin(w) / (2 * 0.7079458),
    a0 = 1 + alpha;
  const b0 = (1 + c) / 2 / a0,
    b1 = -(1 + c) / a0,
    b2 = b0,
    a1 = (-2 * c) / a0,
    a2 = (1 - alpha) / a0;
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < dry.length; i++) {
    const x = input[i] ?? 0,
      y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    dry[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  const wet = new Float32Array(dry.length);
  for (const ms of [29.7, 37.1, 41.1, 43.7]) {
    const n = Math.round((rate * ms) / 1000),
      feedback = 10 ** ((-3 * (n / rate)) / 0.5),
      buf = new Float32Array(n);
    for (let i = 0; i < dry.length; i++) {
      const j = i % n,
        y = buf[j];
      buf[j] = dry[i] + y * feedback;
      wet[i] += y * 0.5;
    }
  }
  for (const ms of [5, 1.7]) {
    const n = Math.round((rate * ms) / 1000),
      buf = new Float32Array(n);
    for (let i = 0; i < wet.length; i++) {
      const j = i % n,
        x = wet[i],
        y = buf[j] - 0.5 * x;
      buf[j] = x + 0.5 * y;
      wet[i] = y;
    }
  }
  for (let i = 0; i < dry.length; i++) dry[i] += 0.35 * wet[i];
  return dry;
}
const cache = new WeakMap();
export function metalHissBuffer(context, buffer) {
  if (cache.has(buffer)) return cache.get(buffer);
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) =>
    metalHissSamples(buffer.getChannelData(i), buffer.sampleRate),
  );
  const result = context.createBuffer(channels.length, channels[0].length, buffer.sampleRate);
  channels.forEach((data, i) => result.copyToChannel(data, i));
  cache.set(buffer, result);
  return result;
}

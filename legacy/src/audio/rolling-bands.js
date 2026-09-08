export const ROLLING_CROSSOVER_HZ = 500;
/** Fourth-order Linkwitz–Riley split: complementary bands sum flat in magnitude. */
export function splitRolling(context, source, destination) {
  const bands = {};
  for (const [name, type] of [
    ['rollingLow', 'lowpass'],
    ['rollingHigh', 'highpass'],
  ]) {
    const filters = [context.createBiquadFilter(), context.createBiquadFilter()];
    for (const filter of filters) {
      filter.type = type;
      filter.frequency.value = ROLLING_CROSSOVER_HZ;
      filter.Q.value = 20 * Math.log10(Math.SQRT1_2);
    }
    const gain = context.createGain();
    gain.gain.value = 1;
    source.connect(filters[0]).connect(filters[1]).connect(gain).connect(destination);
    bands[name] = { filters, gain };
  }
  return bands;
}
export function updateRollingBands(bands, levels, time) {
  for (const [name, band] of Object.entries(bands))
    band.gain.gain.setTargetAtTime(levels[name] ?? 1, time, 0.03);
}
export function disposeRollingBands(bands) {
  for (const band of Object.values(bands)) {
    for (const f of band.filters) f.disconnect();
    band.gain.disconnect();
  }
}

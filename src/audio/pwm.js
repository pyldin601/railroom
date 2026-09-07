// Taurus-inspired audible notes, not Siemens carrier-frequency measurements.
// D4 Dorian over fourteen notes; tuning and 0–20 km/h mapping are approximations.
export const PWM_CARRIERS = [0, 2, 3, 5, 7, 9, 10, 12, 14, 15, 17, 19, 21, 22].map(
  (n) => 293.664768 * 2 ** (n / 12),
);
export const PWM_STEP_MPS = 20 / 3.6 / 13;
export function pwmParameters(speed, controls, running, previous) {
  const v = Math.max(0, Math.min(40, speed));
  let stage = previous ?? Math.min(13, Math.floor(v / PWM_STEP_MPS));
  while (stage < 13 && v > (stage + 1) * PWM_STEP_MPS + 0.035) stage++;
  while (stage > 0 && v < stage * PWM_STEP_MPS - 0.035) stage--;
  const brake = controls.emergency ? 1 : Math.max(0, Math.min(1, controls.brake || 0));
  const load = running
    ? brake > 0
      ? brake * Math.min(1, v / 0.8)
      : Math.max(0, Math.min(1, controls.throttle || 0))
    : 0;
  const startup = 1 - 0.85 * Math.min(1, Math.max(0, (v - 20 / 3.6) / (10 / 3.6)));
  return {
    stage,
    electrical: 24 + v * 9.5,
    deviation: 3 + Math.min(v, 6) * 0.6,
    gain: (0.05 / 3) * Math.pow(load, 0.8) * startup,
    braking: brake > 0,
  };
}

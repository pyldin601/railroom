/** Approved sound balance. Levels are amplitude multipliers, not loudness units. */
export const MIX_LEVELS = Object.freeze({
  impact: 1,
  impactMetal: 1,
  rolling: 1,
  rollingLow: 1,
  rollingHigh: 1,
  ambient: 0.1,
  traction: 0.3,
  brake: 1,
});
export const AUDIO_SETTINGS = Object.freeze({
  master: 1,
  motorMode: 'synth',
  spatial: true,
  yaw: 0,
});
export const ROLLING_TUNING = Object.freeze({
  wheelCents: Object.freeze([-17, 7, 15, -8, 11, -14, -4, 10]),
  phaseStep: 0.371,
  fullLevelSpeed: 22,
  amplitude: 0.28,
  gainSmoothing: 0.12,
  stopFade: 0.03,
  stopTail: 0.035,
});

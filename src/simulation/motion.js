import { initialAir, advanceAir } from './pneumatics.js?v=release-tail';

/** SI units throughout. Coefficients describe a generic vehicle, not operational limits. */
export const DEFAULT_VEHICLE = Object.freeze({
  length: 64000,
  maxSpeed: 260 / 3.6,
  traction: 0.6,
  serviceBrake: 0.8,
  emergencyBrake: 1.2,
  jerk: 0.3,
  resistance: 0.006,
  drag: 0.000015,
  tractionFade: 0.45,
});

export const initialState = (position = 0) => ({
  time: 0,
  position,
  speed: 0,
  acceleration: 0,
  air: initialAir(),
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function resistanceAt(speed, vehicle = DEFAULT_VEHICLE) {
  return speed > 0 ? vehicle.resistance + vehicle.drag * speed ** 2 : 0;
}

export function tractionAt(speed, vehicle = DEFAULT_VEHICLE) {
  return vehicle.traction * (1 - (vehicle.tractionFade * speed) / vehicle.maxSpeed);
}

export function stateInSegment(segment, time) {
  const dt = clamp(time - segment.start.time, 0, segment.duration);
  const air = segment.start.air
    ? {
        air: advanceAir(segment.start.air, segment.airControls || {}, dt, segment.powered ?? true),
      }
    : {};
  return {
    ...air,
    time: segment.start.time + dt,
    position:
      segment.start.position + segment.start.speed * dt + 0.5 * segment.acceleration * dt * dt,
    speed: Math.max(0, segment.start.speed + segment.acceleration * dt),
    acceleration: segment.acceleration,
  };
}

export function advanceMotion(input, controls = {}, dt, options = {}) {
  const vehicle = { ...DEFAULT_VEHICLE, ...options };
  if (!Number.isFinite(dt) || dt < 0 || dt > 60) {
    throw new Error('Motion interval must be between 0 and 60 seconds');
  }
  let state = { ...input };
  let remaining = dt;
  const segments = [];

  while (remaining > 1e-10) {
    let step = Math.min(0.01, remaining);
    const powered = options.powerAt?.(state.position) ?? true;
    const brake = clamp(controls.brake || 0, 0, 1);
    const throttle =
      powered && !controls.emergency && brake === 0 ? clamp(controls.throttle || 0, 0, 1) : 0;
    const cylinderBrake = state.air ? state.air.cylinder / 4 : brake;
    const resistance = resistanceAt(state.speed, vehicle);
    let target;
    if (controls.emergency) {
      target = -vehicle.emergencyBrake;
    } else if (cylinderBrake > 0) {
      target = -cylinderBrake * vehicle.serviceBrake - resistance;
    } else {
      target = throttle * tractionAt(state.speed, vehicle) - resistance;
    }
    let acceleration = controls.emergency
      ? target
      : clamp(
          target,
          state.acceleration - vehicle.jerk * step,
          state.acceleration + vehicle.jerk * step,
        );
    if (!powered && acceleration > 0) acceleration = Math.min(0, target);
    if (state.speed <= 0 && acceleration < 0) acceleration = 0;
    if (state.speed >= vehicle.maxSpeed && acceleration > 0) acceleration = 0;
    if (state.position >= vehicle.length) {
      state.position = vehicle.length;
      state.speed = 0;
      acceleration = 0;
    }

    let duration = step;
    if (acceleration < 0 && state.speed + acceleration * duration < 0) {
      duration = -state.speed / acceleration;
    }
    if (acceleration > 0 && state.speed + acceleration * duration > vehicle.maxSpeed) {
      duration = (vehicle.maxSpeed - state.speed) / acceleration;
    }
    const distance = state.speed * duration + 0.5 * acceleration * duration ** 2;
    if (state.position + distance > vehicle.length) {
      const d = vehicle.length - state.position;
      duration =
        acceleration === 0
          ? d / state.speed
          : (2 * d) /
            (state.speed + Math.sqrt(Math.max(0, state.speed ** 2 + 2 * acceleration * d)));
    }
    const boundary = options.nextPower?.(state.position);
    if (
      boundary !== undefined &&
      state.position + state.speed * duration + 0.5 * acceleration * duration ** 2 > boundary
    ) {
      const d = boundary - state.position;
      duration =
        (2 * d) / (state.speed + Math.sqrt(Math.max(0, state.speed ** 2 + 2 * acceleration * d)));
      step = duration;
    }

    const segment = { start: { ...state }, duration, acceleration, airControls: controls, powered };
    segments.push(segment);
    state = stateInSegment(segment, state.time + duration);
    state.speed = clamp(state.speed, 0, vehicle.maxSpeed);
    state.position = Math.min(state.position, vehicle.length);
    if (state.position >= vehicle.length - 1e-8) {
      state.position = vehicle.length;
      state.speed = 0;
      state.acceleration = 0;
    }
    if (duration < step - 1e-10) {
      const rest = step - duration;
      const stopped = state.speed < 1e-8 || state.position >= vehicle.length;
      const tail = {
        start: { ...state, speed: stopped ? 0 : state.speed },
        duration: rest,
        acceleration: 0,
        airControls: controls,
        powered,
      };
      segments.push(tail);
      state = stateInSegment(tail, state.time + rest);
    }
    remaining -= step;
  }
  return { state, segments };
}

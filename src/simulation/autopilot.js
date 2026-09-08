import { DEFAULT_VEHICLE, resistanceAt, tractionAt } from './motion.js?v=speed260';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const COMFORT = Object.freeze({
  dwellSeconds: 60,
  departureSeconds: 1.4,
  acceleration: 0.28,
  deceleration: 0.32,
  planningDeceleration: 0.2,
  maximumBrake: 0.4,
  holdingBrake: 0.3,
});

/** Comfort profile for the illustrative route, not railway safety equipment. */
export class Autopilot {
  constructor(route, state, trainLength = 0, vehicle = {}) {
    this.route = route;
    this.trainLength = trainLength;
    this.vehicle = { ...DEFAULT_VEHICLE, ...vehicle };
    this.stops = route.stations.filter((stop) => stop.position > state.position + 0.5);
    this.index = 0;
    this.arrivedAt = null;
    this.status = 'Driving';
    this.departureAt = state.speed < 0.08 ? state.time : null;
    this.hornPending = this.departureAt !== null;
  }

  snapshot() {
    return {
      index: this.index,
      arrivedAt: this.arrivedAt,
      status: this.status,
      departureAt: this.departureAt,
      hornPending: this.hornPending,
    };
  }

  restore(snapshot) {
    Object.assign(this, snapshot);
  }

  update(state) {
    const stop = this.stops[this.index];
    if (!stop) {
      this.status = 'Journey complete';
      return {
        throttle: 0,
        brake: COMFORT.holdingBrake,
        emergency: false,
        stopPosition: state.position,
      };
    }
    if (this.departureAt !== null) {
      if (state.time - this.departureAt < COMFORT.departureSeconds) {
        const horn = this.hornPending;
        this.hornPending = false;
        this.status = 'Departure horn';
        return {
          throttle: 0,
          brake: COMFORT.holdingBrake,
          emergency: false,
          stopPosition: state.position,
          horn,
        };
      }
      this.departureAt = null;
    }

    const distance = stop.position - state.position;
    if (distance < 0.15 && state.speed < 0.08) {
      this.arrivedAt ??= state.time;
      const dwell = Number.isFinite(stop.dwellSeconds) && stop.dwellSeconds >= 0
        ? stop.dwellSeconds : COMFORT.dwellSeconds;
      const remaining = Math.max(0, dwell - (state.time - this.arrivedAt));
      const seconds = Math.ceil(remaining);
      const countdown = dwell >= 300
        ? `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
        : `${seconds}s`;
      this.status = `${stop.name} · ${countdown}`;
      if (remaining > 0) {
        return {
          throttle: 0,
          brake: COMFORT.holdingBrake,
          emergency: false,
          stopPosition: stop.position,
        };
      }
      this.index++;
      this.arrivedAt = null;
      this.departureAt = state.time;
      this.hornPending = true;
      return this.update(state);
    }

    let target = this.vehicle.maxSpeed;
    for (const marker of this.route.speedMarkers || []) {
      // Keep the restriction until the rear has cleared its end.
      if (marker.endPosition <= state.position - this.trainLength) continue;
      const limit = Math.max(0, marker.speedKmh / 3.6 - 0.3);
      const ahead = Math.max(0, marker.position - state.position);
      target = Math.min(
        target,
        Math.sqrt(limit * limit + 2 * COMFORT.planningDeceleration * Math.max(0, ahead - 20)),
      );
    }
    // Start early enough for jerk-limited braking, then gently approach the platform.
    target = Math.min(
      target,
      Math.max(0.12, Math.sqrt(2 * COMFORT.planningDeceleration * Math.max(0, distance - 3))),
      Math.max(0.12, distance * 0.3),
    );
    const desired = clamp(
      (target - state.speed) * 0.5,
      -COMFORT.deceleration,
      COMFORT.acceleration,
    );
    const resistance = resistanceAt(state.speed, this.vehicle);
    const throttle =
      desired >= 0
        ? clamp((desired + resistance) / tractionAt(state.speed, this.vehicle), 0, 1)
        : 0;
    // Brake force supplements the resistance already present during coasting.
    const brake =
      desired < 0
        ? clamp((-desired - resistance) / this.vehicle.serviceBrake, 0, COMFORT.maximumBrake)
        : 0;
    this.status = `To ${stop.name}`;
    return {
      throttle: this.route.powerAt?.(state.position) === false ? 0 : throttle,
      brake,
      emergency: false,
      stopPosition: stop.position,
    };
  }
}

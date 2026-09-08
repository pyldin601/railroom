import { Autopilot } from '../simulation/autopilot.js?v=review-fixes';
import {
  advanceMotion,
  initialState,
  stateInSegment,
} from '../simulation/motion.js?v=speed260';
import { findCrossings } from '../simulation/crossings.js?v=silent-welds';

const TIMING = Object.freeze({
  startDelay: 0.06,
  controlDelay: 0.025,
  horizon: 0.15,
  maximumPredictionStep: 0.1,
  underrunTolerance: 0.025,
  retainedHistory: 0.2,
});
const CUTOFF_EPSILON = 1e-8;

/** Predict ahead on the audio clock; no animation-frame timing enters this class. */
export class Transport {
  constructor({ clock, sink, route, axles, vehicle = {} }) {
    Object.assign(this, { clock, sink, route, axles, vehicle });
    this.state = initialState();
    this.controls = { throttle: 0, brake: 0, emergency: false };
    this.segments = [];
    this.autopilotHistory = [];
    this.running = false;
    this.generation = 0;
    this.underruns = 0;
    this.origin = 0;
    this.impacts = 0;
  }

  snapshot(at = this.clock()) {
    if (!this.running || !this.segments.length) return { ...this.state };
    const time = at - this.origin;
    const segment = this.segments.find(
      (segment) => segment.start.time + segment.duration >= time - 1e-10,
    );
    return segment ? stateInSegment(segment, time) : { ...this.predicted };
  }

  setAutopilot(enabled) {
    if (this.running) this.rewindPrediction();
    this.autopilot = enabled
      ? new Autopilot(
          this.route,
          this.running ? this.predicted : this.state,
          Math.max(0, ...this.axles.map((axle) => axle.offset)),
          this.vehicle,
        )
      : null;
    this.controls = { ...this.controls, stopPosition: undefined, throttle: 0, brake: 0 };
    this.resetAutopilotHistory();
    if (this.running) this.tick();
  }

  resetAutopilotHistory() {
    this.autopilotHistory = this.autopilot
      ? [
          {
            time: -Infinity,
            state: this.autopilot.snapshot(),
            controls: { ...this.controls },
          },
        ]
      : [];
  }

  restoreAutopilot(time) {
    if (!this.autopilot) return;
    // Decisions at the cutoff remain committed, just like their audio events.
    while (
      this.autopilotHistory.length > 1 &&
      this.autopilotHistory.at(-1).time > time + CUTOFF_EPSILON
    ) {
      this.autopilotHistory.pop();
    }
    const checkpoint = this.autopilotHistory.at(-1);
    this.autopilot.restore(checkpoint.state);
    this.controls = { ...checkpoint.controls };
  }

  start() {
    if (this.running) return;
    this.origin = this.clock() + TIMING.startDelay - this.state.time;
    this.predicted = { ...this.state };
    this.segments = [];
    this.resetAutopilotHistory();
    this.running = true;
    this.generation++;
    this.tick();
  }

  pause() {
    if (this.running) {
      const now = this.clock();
      this.state = this.snapshot(now);
      // Use the actual clock here: before the start delay, simulation time is
      // clamped to zero but its first horn has not yet happened.
      this.restoreAutopilot(now - this.origin);
    }
    this.running = false;
    this.segments = [];
    this.autopilotHistory = [];
    this.sink.silence();
  }

  seek(position) {
    this.pause();
    this.state = initialState(Math.max(0, Math.min(this.route.length, position)));
    this.generation++;
  }

  rewindPrediction() {
    const effective = Math.min(
      this.clock() + TIMING.controlDelay,
      this.predicted.time + this.origin,
    );
    const next = this.snapshot(effective);
    this.sink.cancelFrom(effective + CUTOFF_EPSILON);
    this.generation++;
    this.restoreAutopilot(effective - this.origin);
    this.segments = this.segments
      .filter((segment) => segment.start.time < next.time)
      .map((segment) => ({
        ...segment,
        duration: Math.min(segment.duration, next.time - segment.start.time),
      }));
    this.predicted = next;
  }

  updateControls(controls) {
    if (this.running) this.rewindPrediction();
    this.controls = { ...this.controls, ...controls };
    if (this.running) this.tick();
  }

  tick() {
    if (!this.running) return;
    const now = this.clock();
    if (now > this.predicted.time + this.origin + TIMING.underrunTolerance) {
      this.state = { ...this.predicted };
      this.underruns++;
      this.pause();
      return;
    }
    const target = now + TIMING.horizon - this.origin;
    if (target <= this.predicted.time) return;
    const duration = Math.min(TIMING.maximumPredictionStep, target - this.predicted.time);
    if (this.autopilot) {
      this.controls = this.autopilot.update(this.predicted);
      if (this.controls.horn) this.sink.horn?.(this.origin + this.predicted.time, this.generation);
      this.autopilotHistory.push({
        time: this.predicted.time,
        state: this.autopilot.snapshot(),
        controls: { ...this.controls },
      });
    }
    const { state, segments } = advanceMotion(this.predicted, this.controls, duration, {
      ...this.vehicle,
      length: Math.min(this.route.length, this.controls.stopPosition ?? this.route.length),
      powerAt: (position) => this.route.powerAt?.(position) ?? true,
      nextPower: (position) => this.route.nextPower?.(position),
    });
    const events = findCrossings(segments, this.axles, this.route);
    for (const event of events) {
      this.sink.hit(event, this.origin + event.simulationTime, this.generation);
      this.impacts++;
    }
    const powerRoute = {
      between: (start, end) =>
        (this.route.powerMarkers || [])
          .filter(
            (marker) =>
              marker.position > start + CUTOFF_EPSILON && marker.position <= end + CUTOFF_EPSILON,
          )
          .map((marker) => ({ ...marker, side: 'center' })),
    };
    for (const event of findCrossings(segments, [{ id: 'locomotive', offset: 0 }], powerRoute)) {
      this.sink.power?.(event, this.origin + event.simulationTime, this.generation);
    }
    this.segments.push(...segments);
    this.predicted = state;
    const retainFrom = now - this.origin - TIMING.retainedHistory;
    this.segments = this.segments.filter(
      (segment) => segment.start.time + segment.duration >= retainFrom,
    );
    // Keep one preceding controller checkpoint so every retained motion segment
    // has a corresponding controller state, without accumulating journey history.
    while (this.autopilotHistory.length > 1 && this.autopilotHistory[1].time < retainFrom) {
      this.autopilotHistory.shift();
    }
    if (this.predicted.time < target - CUTOFF_EPSILON) this.tick();
  }
}

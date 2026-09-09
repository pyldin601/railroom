import { scan, withLatestFrom } from 'rxjs';
import type { Observable } from 'rxjs';
import type { ControlState } from './controls';
import { clamp } from './helpers';

/** Maximum permitted speed in metres per second. */
export interface TrainConfig {
  readonly maximumSpeed: number;
}

const MAX_TRACTION = 0.6;
const MAX_SERVICE_BRAKE = 0.8;
const ROLLING_RESISTANCE = 0.006;
const AERODYNAMIC_DRAG = 0.000015;
const TRACTION_FADE = 0.45;

function resistanceAt(speed: number) {
  return speed > 0 ? ROLLING_RESISTANCE + AERODYNAMIC_DRAG * speed ** 2 : 0;
}

/** Emits train speed in metres per second for each elapsed clock tick. */
export const speed$ = (
  clock$: Observable<number>,
  controlState$: Observable<ControlState>,
  config: TrainConfig,
) =>
  clock$.pipe(
    withLatestFrom(controlState$),
    scan((speed, [tick, state]) => {
      const maximumSpeed = Math.max(0, config.maximumSpeed);
      const throttle = clamp(state.accelerateLevel, 0, 1);
      const brake = clamp(state.brakeLevel, 0, 1);
      const traction =
        maximumSpeed === 0 ? 0 : MAX_TRACTION * (1 - (TRACTION_FADE * speed) / maximumSpeed);
      const acceleration =
        brake > 0
          ? -brake * MAX_SERVICE_BRAKE - resistanceAt(speed)
          : throttle * traction - resistanceAt(speed);

      return clamp(speed + acceleration * (tick / 1000), 0, maximumSpeed);
    }, 0),
  );

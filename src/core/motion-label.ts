import { distinctUntilChanged, map, shareReplay, startWith, withLatestFrom } from 'rxjs';
import type { Observable } from 'rxjs';
import type { ControlState } from './controls';

export type MotionLabel = 'coasting' | 'accelerating' | 'braking' | 'stationary';

/**
 * Emits changes in the speed trend, starting with idle until two readings arrive.
 * Falling speed is labelled braking, including slowing caused by resistance alone.
 */
export const motionLabel = (
  speed$: Observable<number>,
  acceleration$: Observable<number>,
  controlState$: Observable<ControlState>,
): Observable<MotionLabel> => {
  return speed$.pipe(
    withLatestFrom(controlState$, acceleration$),
    map(([speed, { brakeLevel }, acceleration]): MotionLabel => {
      if (speed < 0.05) {
        return 'stationary';
      }
      if (brakeLevel > 0) {
        return 'braking';
      }
      if (acceleration > 0.01) {
        return 'accelerating';
      }
      return 'coasting';
    }),
    startWith<MotionLabel>('stationary'),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
};

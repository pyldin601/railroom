import { distinctUntilChanged, map, pairwise, shareReplay, startWith } from 'rxjs';
import type { Observable } from 'rxjs';

export type MotionLabel = 'coasting' | 'accelerating' | 'braking' | 'idle';

/**
 * Emits changes in the speed trend, starting with idle until two readings arrive.
 * Falling speed is labelled braking, including slowing caused by resistance alone.
 */
export const motionLabel = (speed$: Observable<number>): Observable<MotionLabel> => {
  return speed$.pipe(
    pairwise(),
    map(([previous, current]): MotionLabel => {
      if (current > previous) return 'accelerating';
      if (current < previous) return 'braking';
      return current === 0 ? 'idle' : 'coasting';
    }),
    startWith<MotionLabel>('idle'),
    distinctUntilChanged(),
    shareReplay(1),
  );
};

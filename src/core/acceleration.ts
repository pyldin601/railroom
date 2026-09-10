import { map, pairwise, shareReplay, startWith, withLatestFrom } from 'rxjs';
import type { Observable } from 'rxjs';

/**
 * Emits acceleration in m/s² from speed sampled on each clock tick (milliseconds).
 * Starts at zero until two samples arrive; negative values indicate slowing down.
 */
export const acceleration = (
  tick$: Observable<number>,
  speed$: Observable<number>,
): Observable<number> => {
  return tick$.pipe(
    withLatestFrom(speed$),
    pairwise(),
    map(([[, previousSpeed], [tick, currentSpeed]]) => {
      return tick > 0 ? (currentSpeed - previousSpeed) / (tick / 1000) : 0;
    }),
    startWith(0),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
};

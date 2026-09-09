import { animationFrames, BehaviorSubject, filter, map, pairwise, withLatestFrom } from 'rxjs';

/** Emits whether the clock is paused; set it to `true` to suppress ticks. */
export const paused$ = new BehaviorSubject(false);

/** Emits the milliseconds elapsed between animation frames while not paused. */
export const clock$ = animationFrames().pipe(
  map(({ timestamp }) => timestamp),
  pairwise(),
  withLatestFrom(paused$),
  filter(([, paused]) => !paused),
  map(([[previous, current]]) => current - previous),
);

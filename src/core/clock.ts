import { animationFrames, BehaviorSubject, filter, map, pairwise, withLatestFrom } from 'rxjs';

export const paused$ = new BehaviorSubject(false);

export const clock$ = animationFrames().pipe(
  map(({ timestamp }) => timestamp),
  pairwise(),
  withLatestFrom(paused$),
  filter(([, paused]) => !paused),
  map(([[previous, current]]) => current - previous),
);

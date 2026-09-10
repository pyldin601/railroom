import { type Observable, scan, startWith, withLatestFrom } from 'rxjs';

/** Emits the train position in metres for each elapsed clock tick. */
export const position = (
  tick$: Observable<number>,
  speed$: Observable<number>,
  initialPosition: number,
) => {
  return tick$.pipe(
    withLatestFrom(speed$),
    scan((position, [tick, speed]) => {
      return position + speed * (tick / 1000);
    }, initialPosition),
    startWith(initialPosition),
  );
};

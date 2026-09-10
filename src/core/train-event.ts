import { Observable, mergeMap, first, from, map } from 'rxjs';
import type { TrackItem } from '../simulator/types/track';
import type { TrainConfig } from '../simulator/types/train';

export const trainEvent = (
  trackItem$: Observable<TrackItem>,
  distance$: Observable<number>,
  trainConfig: TrainConfig,
) => {
  const axles: { axleOffset: number; cargoId: string }[] = [];
  let cairoOffset = 0;

  for (const cairo of trainConfig.cairos) {
    const boogieOffsets = [
      cairo.length / 2 - cairo.bogieCentres / 2,
      cairo.length / 2 + cairo.bogieCentres / 2,
    ];

    const axleOffsets = boogieOffsets.flatMap((boogieOffset) => [
      boogieOffset - cairo.bogieWheelbase / 2,
      boogieOffset + cairo.bogieWheelbase / 2,
    ]);

    for (const axleOffset of axleOffsets) {
      axles.push({ axleOffset: cairoOffset + axleOffset, cargoId: cairo.id });
    }

    cairoOffset += cairo.length;
  }

  const axleStream$ = from(axles);

  return trackItem$.pipe(
    mergeMap((item) =>
      axleStream$.pipe(
        mergeMap(({ axleOffset, cargoId }, index) =>
          distance$.pipe(
            map((distance) => distance + axleOffset),
            first((distance) => distance >= item.position),
            map((distance) => ({
              cargoId,
              axleIndex: index,
              trackObject: item.object,
              atDistance: distance,
            })),
          ),
        ),
      ),
    ),
  );
};

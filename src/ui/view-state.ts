/** Display values only; simulation owns the authoritative motion state. */
export interface TrainViewState {
  readonly status: string;
  readonly speedKmh: number;
  readonly positionM: number;
  readonly routeLengthM: number;
}

export const initialViewState: Readonly<TrainViewState> = {
  status: 'Template preview',
  speedKmh: 0,
  positionM: 0,
  routeLengthM: 64_000,
};

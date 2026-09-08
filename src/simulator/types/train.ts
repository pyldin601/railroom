export interface TrainControls {
  /** Requested acceleration level from 0 (none) to 1 (full), not actual acceleration. */
  accelerationLevel: number;
  /** Requested braking level from 0 (released) to 1 (full). */
  brakingLevel: number;
}

/** Carriage geometry with two bogies and two axles per bogie. */
export interface Cairo {
  /** Stable carriage identifier, unique within the train. */
  id: string;
  /** Coupler-to-coupler length in metres. */
  length: number;
  /** Distance between bogie centres in metres. */
  bogieCentres: number;
  /** Distance between the two axles of each bogie in metres. */
  bogieWheelbase: number;
}

export interface TrainState {
  /** Current driver inputs used to calculate motion. */
  trainControls: TrainControls;
  /** Whether the power line supplies electricity for traction. */
  powerLineStatus: 'on' | 'off';
}

export interface SeatPosition {
  /** Carriage number, starting at 1 at the front of the train. */
  cairoNumber: number;
  /** Position in metres from the start of the carriage, increasing toward its rear. */
  position: number;
}

export interface TrainConfig {
  /** Carriages ordered from the front of the train to the rear. */
  cairos: Cairo[];
  /** Listener seat location within a carriage. */
  seatPosition: SeatPosition;
}

export interface Train {
  /** Current operating inputs and conditions. */
  state: TrainState;
  /** Train composition and geometry. */
  config: TrainConfig;
}

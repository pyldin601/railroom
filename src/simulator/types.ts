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
  /** Carriages ordered from the front of the train to the rear. */
  cairos: Cairo[];
}

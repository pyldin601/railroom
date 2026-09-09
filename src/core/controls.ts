import { scan, Subject, startWith } from 'rxjs';

export enum ControlEventType {
  AccelerateChange = 'accelerateChange',
  BrakeChange = 'brakeChange',
  HornPress = 'hornPress',
  HornRelease = 'hornRelease',
}

/** Changes and actions emitted by the driving controls. */
export type ControlEvent =
  /** Acceleration slider changed to a value from 0 to 100 percent. */
  | { readonly type: ControlEventType.AccelerateChange; readonly value: number }
  /** Service-brake slider changed to a value from 0 to 100 percent. */
  | { readonly type: ControlEventType.BrakeChange; readonly value: number }
  /** Horn button pressed. */
  | { readonly type: ControlEventType.HornPress }
  /** Horn button release. */
  | { readonly type: ControlEventType.HornRelease };

/** Receives control events dispatched by the UI. */
export const controlEvents$ = new Subject<ControlEvent>();

/** The current positions and actions of the driving controls. */
export interface ControlState {
  readonly accelerateLevel: number;
  readonly brakeLevel: number;
  readonly hornPressed: boolean;
}

/** The state emitted to each new control-state subscriber. */
const INITIAL_CONTROL_STATE: ControlState = {
  accelerateLevel: 0,
  brakeLevel: 0,
  hornPressed: false,
};

/** Emits the initial controls state, followed by state reduced from each control event. */
export const controlState$ = controlEvents$.pipe(
  scan<ControlEvent, ControlState>((state, event) => {
    switch (event.type) {
      case ControlEventType.AccelerateChange:
        return { ...state, accelerateLevel: event.value };
      case ControlEventType.BrakeChange:
        return { ...state, brakeLevel: event.value };
      case ControlEventType.HornPress:
        return { ...state, hornPressed: true };
      case ControlEventType.HornRelease:
        return { ...state, hornPressed: false };
      default:
        return state;
    }
  }, INITIAL_CONTROL_STATE),
  startWith(INITIAL_CONTROL_STATE),
);

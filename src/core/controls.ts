import { Subject } from 'rxjs';

export enum ControlEventType {
  AccelerateChange = 'accelerateChange',
  BrakeChange = 'brakeChange',
  HornPress = 'hornPress',
}

/** Changes and actions emitted by the driving controls. */
export type ControlEvent =
  /** Acceleration slider changed to a value from 0 to 100 percent. */
  | { readonly type: ControlEventType.AccelerateChange; readonly value: number }
  /** Service-brake slider changed to a value from 0 to 100 percent. */
  | { readonly type: ControlEventType.BrakeChange; readonly value: number }
  /** Horn button pressed. */
  | { readonly type: ControlEventType.HornPress };

export const controlEvents$ = new Subject<ControlEvent>();

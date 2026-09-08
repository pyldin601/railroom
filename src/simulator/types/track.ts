export enum TrackObjectType {
  Joint = 'joint',
  SpeedLimit = 'speedLimit',
  Station = 'station',
  PowerOff = 'power_off',
  PowerOn = 'power_on',
}

/** Track object data, independent of its placement along the route. */
export type TrackObject =
  /** Rail joint that produces an impact when crossed by a wheel. */
  | { readonly type: TrackObjectType.Joint }
  /** Speed restriction applying from this item until the next speed-limit item. */
  | { readonly type: TrackObjectType.SpeedLimit; readonly speed: number }
  /** Named station or passenger stop along the route. */
  | { readonly type: TrackObjectType.Station; readonly name: string }
  /** Marker that switches traction power off. */
  | { readonly type: TrackObjectType.PowerOff }
  /** Marker that switches traction power on. */
  | { readonly type: TrackObjectType.PowerOn };

/** A track object placed at a specific route coordinate. */
export interface TrackItem {
  /** Position in metres from the start of the track. */
  readonly position: number;
  /** Object data describing what is located at this position. */
  readonly object: TrackObject;
}

/** Route extent and its ordered, flat collection of placed objects. */
export interface Track {
  /** Total route length in metres. */
  readonly length: number;
  /** Objects sorted by position; multiple objects may share a position. */
  readonly items: TrackItem[];
}

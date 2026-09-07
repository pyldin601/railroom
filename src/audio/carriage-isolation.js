import { COACH } from '../route/coach-geometry.js';
/** Interior transmission, relative to the occupied carriage's sound level. */
export function carriageGain(car, occupied) {
  return [1, 0.3, 0.05][Math.abs(car - occupied)] ?? 0;
}
export function occupiedCarriage(seat) {
  return Math.max(1, Math.floor((seat + COACH.couplerOverhang) / COACH.pitch) + 1);
}

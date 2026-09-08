/** User-supplied Cairo dimensions in metres; origin is the leading axle.
 * CAIRO_LENGTH is interpreted as coupler-to-coupler spacing.
 * Dimensions and assumptions: COACH-GEOMETRY.md.
 */
export const DEFAULT_CARRIAGES = 10;
export const CAIRO_LENGTH = 24.75;
export const CAIRO_PIVOT_LENGTH = 17;
export const CAIRO_WHEEL_PAIR_LENGTH = 2.4;

const axleSpan = CAIRO_PIVOT_LENGTH + CAIRO_WHEEL_PAIR_LENGTH;
export const COACH = Object.freeze({
  model: 'Cairo',
  pitch: CAIRO_LENGTH,
  bogieCentres: CAIRO_PIVOT_LENGTH,
  bogieWheelbase: CAIRO_WHEEL_PAIR_LENGTH,
  axles: Object.freeze([0, CAIRO_WHEEL_PAIR_LENGTH, CAIRO_PIVOT_LENGTH, axleSpan]),
  centre: axleSpan / 2,
  couplerOverhang: (CAIRO_LENGTH - axleSpan) / 2,
});
export const SEAT_POSITIONS = Object.freeze([2, COACH.centre, axleSpan - 2]);

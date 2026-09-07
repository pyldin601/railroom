/** KVBZ 61-779 on TVZ-TsNII-M bogies. Metres; origin is the leading axle.
 * Dimensions and assumptions: COACH-GEOMETRY.md.
 */
export const COACH = Object.freeze({
  model: 'КВБЗ 61-779',
  bogie: 'ТВЗ-ЦНИИ-М',
  pitch: 26.696,
  bogieCentres: 19,
  bogieWheelbase: 2.4,
  axles: Object.freeze([0, 2.4, 19, 21.4]),
  centre: 10.7,
  couplerOverhang: 2.648,
});

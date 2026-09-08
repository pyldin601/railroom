import { COACH } from '../route/coach-geometry.js';
function transmission(longitudinal, side, metalReach) {
  const distance = Math.hypot(longitudinal, side === 'center' ? 0 : 0.76, 1.5);
  const travel = Math.max(0, longitudinal - COACH.centre) / COACH.pitch;
  return {
    direct: Math.pow(0.3, travel) / (1 + distance / 18),
    metal:
      Math.pow(0.62, Math.max(0, longitudinal / metalReach - COACH.centre) / COACH.pitch) /
      Math.sqrt(1 + distance / (35 * metalReach)),
  };
}
/** Artistic continuous transmission curves; not measured carriage acoustics. */
export function impactDistance(axle, seat, occupied, side, metalReach = 1) {
  const gain = transmission(Math.abs(axle.offset - seat), side, metalReach);
  if ((axle.car ?? occupied) === occupied) return gain;
  const base = (occupied - 1) * COACH.pitch;
  const farthestLocal = Math.max(...COACH.axles.map((offset) => Math.abs(base + offset - seat)));
  const nearestExternal = Math.min(
    Math.abs(base - COACH.pitch + COACH.axles.at(-1) - seat),
    Math.abs(base + COACH.pitch - seat),
  );
  const local = transmission(farthestLocal, side, metalReach),
    external = transmission(nearestExternal, side, metalReach);
  // Boost outside wheels, but keep even the nearest below the quietest local
  // wheel. One factor per layer preserves distance contrast along every coach.
  return {
    direct: gain.direct * Math.min(0.6, (0.9 * local.direct) / external.direct),
    metal: gain.metal * Math.min(0.9, (0.9 * local.metal) / external.metal),
  };
}

/** Smooth end isolation over three coach lengths; never reduce the local car. */
export function endHissGain(axle, occupied, cars) {
  if (axle.car === occupied) return 1;
  const last = (cars - 1) * COACH.pitch + COACH.axles.at(-1);
  const edgeDistance = Math.max(0, Math.min(axle.offset, last - axle.offset));
  const t = Math.min(1, edgeDistance / (3 * COACH.pitch));
  return 0.1 + 0.9 * t * t * (3 - 2 * t);
}

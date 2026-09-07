import {COACH} from '../route/coach-geometry.js';
/** Artistic continuous transmission curves; not measured carriage acoustics. */
export function impactDistance(axle,seat,occupied,side){
 const longitudinal=Math.abs(axle.offset-seat);
 const distance=Math.hypot(longitudinal,side==='center'?0:.76,1.5);
 // Distance attenuation stays continuous along the train. The occupied
 // carriage additionally shields the listener from external wheel sources.
 const travel=Math.max(0,longitudinal-COACH.centre)/COACH.pitch;
 const outside=(axle.car??occupied)!==occupied;
 return {direct:(outside?.4:1)*Math.pow(.3,travel)/(1+distance/18),metal:(outside?.7:1)*Math.pow(.62,travel)/Math.sqrt(1+distance/35)};
}

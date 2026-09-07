/** Artistic air/structure transmission curves; not measured carriage acoustics. */
export function impactDistance(axle,seat,occupied,side){
 const cars=Math.abs((axle.car??1)-occupied);
 const distance=Math.hypot(axle.offset-seat,side==='center'?0:.76,1.5);
 return {direct:Math.pow(.3,cars)/(1+distance/18),metal:Math.pow(.62,cars)/Math.sqrt(1+distance/35)};
}

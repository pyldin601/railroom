// Simplified equivalent pneumatic circuit; bar, seconds. Not vehicle specifications.
export const initialAir=()=>({cylinder:0,reservoir:8.5,compressor:false,releaseFlow:0});
export function advanceAir(input,controls,dt,powered=true){
 const air={...input};if(dt<=0)return air;
 const demand=controls.emergency?4:4*Math.max(0,Math.min(1,controls.brake||0));
 const target=Math.min(demand,air.reservoir);
 // Exhaust flow falls with remaining pressure instead of stopping at a constant rate.
 const gap=target-air.cylinder;
 const delta=gap<0?gap*(1-Math.exp(-dt/1.4)):Math.min(2.5*dt,gap);
 air.cylinder=Math.max(0,air.cylinder+delta);if(target===0&&air.cylinder<.005)air.cylinder=0;air.releaseFlow=Math.max(0,-delta/dt);
 let compressor=air.compressor;if(air.reservoir<=7.2)compressor=true;if(air.reservoir>=9)compressor=false;
 air.compressor=compressor&&powered;
 air.reservoir=Math.max(0,Math.min(9,air.reservoir-Math.max(0,delta)*.45+(air.compressor?.16:0)*dt-.0005*dt));
 return air;
}

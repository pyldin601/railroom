import {DEFAULT_VEHICLE} from './motion.js?v=speed360';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/** Comfort profile for the illustrative route, not railway safety equipment. */
export class Autopilot{
 constructor(route,state,trainLength=0){this.route=route;this.trainLength=trainLength;this.stops=route.stations.filter(s=>s.position>state.position+.5);this.index=0;this.arrivedAt=null;this.status='Driving';this.departureAt=state.speed<.08?state.time:null;this.hornPending=this.departureAt!==null;}
 update(state){
  const stop=this.stops[this.index];
  if(!stop){this.status='Journey complete';return {throttle:0,brake:.3,emergency:false,stopPosition:state.position};}
  if(this.departureAt!==null){
   if(state.time-this.departureAt<1.4){
    const horn=this.hornPending;this.hornPending=false;this.status='Departure horn';
    return {throttle:0,brake:.3,emergency:false,stopPosition:state.position,horn};
   }
   this.departureAt=null;
  }
  const distance=stop.position-state.position;
  if(distance<.15&&state.speed<.08){
   this.arrivedAt??=state.time;
   const remaining=Math.max(0,60-(state.time-this.arrivedAt));
   this.status=`${stop.name} · ${Math.ceil(remaining)}s`;
   if(remaining>0)return {throttle:0,brake:.3,emergency:false,stopPosition:stop.position};
   this.index++;this.arrivedAt=null;this.departureAt=state.time;this.hornPending=true;return this.update(state);
  }
  let target=DEFAULT_VEHICLE.maxSpeed;
  for(const m of this.route.speedMarkers||[]){
   // Keep the restriction until the rear has cleared its end.
   if(m.endPosition<=state.position-this.trainLength)continue;
   const limit=Math.max(0,m.speedKmh/3.6-.3);
   const ahead=Math.max(0,m.position-state.position);
   target=Math.min(target,Math.sqrt(limit*limit+2*.2*Math.max(0,ahead-20)));
  }
  // Start early enough for jerk-limited braking, then gently approach the platform.
  target=Math.min(target,Math.max(.12,Math.sqrt(2*.2*Math.max(0,distance-3))),Math.max(.12,distance*.3));
  const desired=clamp((target-state.speed)*.5,-.32,.28);
  const resistance=.006+.000015*state.speed**2;
  const throttle=desired>=0?clamp((desired+resistance)/(.6*(1-.45*state.speed/DEFAULT_VEHICLE.maxSpeed)),0,1):0;
  this.status=`To ${stop.name}`;
  return {throttle:this.route.powerAt?.(state.position)===false?0:throttle,brake:desired<0?Math.min(.4,-desired/.8):0,emergency:false,stopPosition:stop.position};
 }
}

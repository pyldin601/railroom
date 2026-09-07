/** SI units throughout. Coefficients describe a generic vehicle, not operational limits. */
export const DEFAULT_VEHICLE = Object.freeze({length:64000,maxSpeed:120/3.6,traction:.6,serviceBrake:.8,emergencyBrake:1.2,jerk:.3,resistance:.006,drag:.000015,tractionFade:.45});
export const initialState = (position=0)=>({time:0,position,speed:0,acceleration:0});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function stateInSegment(seg,time){
 const dt=clamp(time-seg.start.time,0,seg.duration);
 return {time:seg.start.time+dt,position:seg.start.position+seg.start.speed*dt+.5*seg.acceleration*dt*dt,speed:Math.max(0,seg.start.speed+seg.acceleration*dt),acceleration:seg.acceleration};
}
export function advanceMotion(input,controls={},dt,options={}){
 const c={...DEFAULT_VEHICLE,...options};
 if(!Number.isFinite(dt)||dt<0||dt>60)throw new Error('Motion interval must be between 0 and 60 seconds');
 let state={...input},remaining=dt;const segments=[];
 while(remaining>1e-10){
  const step=Math.min(.01,remaining);const brake=clamp(controls.brake||0,0,1),throttle=clamp(controls.throttle||0,0,1);
  const resistance=state.speed>0?c.resistance+c.drag*state.speed**2:0;
  let target=controls.emergency?-c.emergencyBrake:brake>0?-brake*c.serviceBrake:throttle*c.traction*(1-c.tractionFade*state.speed/c.maxSpeed)-resistance;
  let acceleration=controls.emergency?target:clamp(target,state.acceleration-c.jerk*step,state.acceleration+c.jerk*step);
  if(state.speed<=0&&acceleration<0)acceleration=0;
  if(state.speed>=c.maxSpeed&&acceleration>0)acceleration=0;
  if(state.position>=c.length){state.position=c.length;state.speed=0;acceleration=0;}
  let duration=step;
  if(acceleration<0&&state.speed+acceleration*duration<0)duration=-state.speed/acceleration;
  if(acceleration>0&&state.speed+acceleration*duration>c.maxSpeed)duration=(c.maxSpeed-state.speed)/acceleration;
  const distance=state.speed*duration+.5*acceleration*duration**2;
  if(state.position+distance>c.length){
   const d=c.length-state.position;
   duration=acceleration===0?d/state.speed:2*d/(state.speed+Math.sqrt(Math.max(0,state.speed**2+2*acceleration*d)));
  }
  const seg={start:{...state},duration,acceleration};segments.push(seg);state=stateInSegment(seg,state.time+duration);
  state.speed=clamp(state.speed,0,c.maxSpeed);state.position=Math.min(state.position,c.length);
  if(state.position>=c.length-1e-8){state.position=c.length;state.speed=0;state.acceleration=0;}
  if(duration<step-1e-10){
   const rest=step-duration;
   const stopped=state.speed<1e-8||state.position>=c.length;
   const tail={start:{...state,speed:stopped?0:state.speed},duration:rest,acceleration:0};
   segments.push(tail);state=stateInSegment(tail,state.time+rest);
  }
  remaining-=step;
 }
 return {state,segments};
}

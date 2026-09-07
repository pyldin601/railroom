import {RecordedMotor} from './recorded-motor.js?v=brake-grains';
export function brakeParameters(state,controls,running){
 const speed=Math.max(0,state.speed),pressure=controls.emergency?1:Math.max(0,Math.min(1,controls.brake||0));
 return {load:running?pressure*Math.min(1,speed/2):0,rate:.55+1.15*Math.min(1,speed/(120/3.6))};
}
export class BrakingLayers{
 constructor(context,bank,mixer){
  const local=axles=>axles.filter(a=>a.car===(mixer.occupied??1)).filter((_,i)=>i===0||i===2);
  const common={level:'brake',axles:local,parameters:brakeParameters,lazy:true};
  this.tone=new RecordedMotor(context,bank,mixer,{...common,kind:'brake-tone',gain:.14});
  this.hiss=new RecordedMotor(context,bank,mixer,{...common,kind:'brake-hiss',gain:.10,parameters:(s,c,r)=>({...brakeParameters(s,c,r),rate:1}),align:false,
   // Spread noise grains through the recording; no repeating deceleration sweep.
   offset:(voice,duration)=>{voice.grainIndex=(voice.grainIndex??0)+1;return ((voice.grainIndex*.61803398875+voice.index*.371)%1)*Math.max(0,duration-.20);}});
 }
 start(){this.tone.start();this.hiss.start();}
 update(state,controls,running){this.tone.update(state,controls,running);this.hiss.update(state,controls,running);}
 stop(at){this.tone.stop(at);this.hiss.stop(at);}
}

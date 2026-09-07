import {CabinAmbience} from './ambient.js';
import {splitRolling,updateRollingBands,disposeRollingBands} from './rolling-bands.js';
import {BrakingLayers} from './braking.js';
import {RecordedMotor} from './recorded-motor.js?v=brake-grains';
import {TractionMotor} from './traction.js?v=motor-start';
// Fixed, irregular cents offsets: centred overall, with no speed-driven pitch shift.
const WHEEL_CENTS=[-17,7,15,-8,11,-14,-4,10];
export function rollingWheels(axles, occupied=1){
 return axles.filter(a=>(a.car??1)===occupied).flatMap(a=>['left','right'].map(side=>({axle:a,side}))).map((w,i)=>({...w,offset:(i*.371)%1,rate:2**(WHEEL_CENTS[i%WHEEL_CENTS.length]/1200)}));
}
/** Recorded rolling/braking plus continuously synthesized traction. */
export class RollingLayers{
 constructor(context,bank,mixer){Object.assign(this,{context,bank,mixer});this.layers=[];this.started=false;this.ambient=new CabinAmbience(context,mixer);this.motor=new TractionMotor(context,mixer);this.recordedMotor=new RecordedMotor(context,bank,mixer);this.braking=new BrakingLayers(context,bank,mixer);}
 start(){if(this.started)return;this.started=true;if(this.mixer.motorMode==='recorded')this.recordedMotor.start();else this.motor.start();
  this.braking.start();this.ambient.start();
  for(const kind of ['rolling','idle','air']){
   const pool=this.bank.pool(kind);if(!pool.length)continue;
   const audible=this.mixer.audibleAxles??this.mixer.axles;
   const local=audible.find(a=>a.car===this.mixer.occupied)??audible[0];
   const feeds=kind==='rolling'?rollingWheels(audible,this.mixer.occupied??1):[{axle:local,side:'center',offset:0,rate:1}];
   for(const [i,feed] of feeds.entries()){
    const {axle,side}=feed;
    const sample=pool[i%pool.length],source=this.context.createBufferSource(),gain=this.context.createGain(),fade=this.context.createGain();source.buffer=sample.buffer;source.playbackRate.value=feed.rate;source.loop=true;source.loopStart=sample.loopStart||0;source.loopEnd=sample.loopEnd||sample.buffer.duration;gain.gain.value=0;
    const bands=kind==='rolling'?splitRolling(this.context,source,gain):{};
    if(kind!=='rolling')source.connect(gain);
    gain.connect(fade).connect(this.mixer.emitters.get(`${axle.id}:${side}`).gain);
    source.start(0,source.loopStart+(source.loopEnd-source.loopStart)*feed.offset);this.layers.push({bands,kind,source,gain,fade,sample,wheelsetId:axle.id,side,rate:feed.rate});
   }
  }
 }
 update(state,controls,running){if(!this.started)return;this.ambient.update(state,controls,running);this.motor.update(state,controls,running);this.recordedMotor.update(state,controls,running);this.braking.update(state,controls,running);const speed=state.speed,t=this.context.currentTime;
  for(const layer of this.layers){let level=0;
   if(running){
    if(layer.kind==='rolling')level=Math.min(1,speed/22)*.14/Math.sqrt((this.mixer.audibleAxles??this.mixer.axles).length/4)*this.mixer.levels.rolling/Math.sqrt(2);
    if(layer.kind==='idle')level=.025;
    if(layer.kind==='air')level=Math.min(1,speed/33)*.045;
   }
   updateRollingBands(layer.bands,this.mixer.levels,t);
   layer.gain.gain.setTargetAtTime(level*(layer.sample.gain??1),t,.12);
  }
 }
 setMotorMode(mode){
  this.motor.stop();this.recordedMotor.stop();this.mixer.motorMode=mode;
  if(this.started){if(mode==='recorded')this.recordedMotor.start();else this.motor.start();}
 }
 stop(at=this.context.currentTime){
  this.ambient.stop(at);this.motor.stop(at);this.recordedMotor.stop(at);this.braking.stop(at);
  for(const l of this.layers){
   l.fade.gain.setValueAtTime(1,at);
   l.fade.gain.linearRampToValueAtTime(0,at+.03);
   l.source.onended=()=>{l.source.disconnect();disposeRollingBands(l.bands);l.gain.disconnect();l.fade.disconnect();};
   l.source.stop(at+.035);
  }
  this.layers=[];this.started=false;
 }
}

import {RecordedMotor} from './recorded-motor.js?v=coach61779';
import {TractionMotor} from './traction.js?v=coach61779';
/** Recorded rolling/braking plus continuously synthesized traction. */
export class RollingLayers{
 constructor(context,bank,mixer){Object.assign(this,{context,bank,mixer});this.layers=[];this.started=false;this.motor=new TractionMotor(context,mixer);this.recordedMotor=new RecordedMotor(context,bank,mixer);}
 start(){if(this.started)return;this.started=true;if(this.mixer.motorMode==='recorded')this.recordedMotor.start();else this.motor.start();
  for(const kind of ['rolling','brake','idle','air']){
   const pool=this.bank.pool(kind);if(!pool.length)continue;
   const audible=this.mixer.audibleAxles??this.mixer.axles;
   const local=audible.find(a=>a.car===this.mixer.occupied)??audible[0];
   const axles=kind==='rolling'?audible:[local];
   for(const [i,axle] of axles.entries()){
    const sample=pool[i%pool.length],source=this.context.createBufferSource(),gain=this.context.createGain(),fade=this.context.createGain();source.buffer=sample.buffer;source.loop=true;source.loopStart=sample.loopStart||0;source.loopEnd=sample.loopEnd||sample.buffer.duration;gain.gain.value=0;
    source.connect(gain).connect(fade).connect(this.mixer.emitters.get(`${axle.id}:center`).gain);
    source.start(0,source.loopStart+(source.loopEnd-source.loopStart)*((i*.371)%1));this.layers.push({kind,source,gain,fade,sample});
   }
  }
 }
 update(state,controls,running){if(!this.started)return;this.motor.update(state,controls,running);this.recordedMotor.update(state,controls,running);const speed=state.speed,t=this.context.currentTime;
  for(const layer of this.layers){let level=0;
   if(running){
    if(layer.kind==='rolling')level=Math.min(1,speed/22)*.14/Math.sqrt((this.mixer.audibleAxles??this.mixer.axles).length/4)*this.mixer.levels.rolling;
    if(layer.kind==='brake')level=Math.min(1,speed/3)*(controls.emergency?1:(controls.brake||0))*.16*this.mixer.levels.brake;
    if(layer.kind==='idle')level=.025;
    if(layer.kind==='air')level=Math.min(1,speed/33)*.045;
   }
   layer.gain.gain.setTargetAtTime(level*(layer.sample.gain??1),t,.12);
   if(layer.kind==='rolling')layer.source.playbackRate.setTargetAtTime(.94+.12*Math.min(1,speed/33),t,.25);
  }
 }
 setMotorMode(mode){
  this.motor.stop();this.recordedMotor.stop();this.mixer.motorMode=mode;
  if(this.started){if(mode==='recorded')this.recordedMotor.start();else this.motor.start();}
 }
 stop(at=this.context.currentTime){
  this.motor.stop(at);this.recordedMotor.stop(at);
  for(const l of this.layers){
   l.fade.gain.setValueAtTime(1,at);
   l.fade.gain.linearRampToValueAtTime(0,at+.03);
   l.source.onended=()=>{l.source.disconnect();l.gain.disconnect();l.fade.disconnect();};
   l.source.stop(at+.035);
  }
  this.layers=[];this.started=false;
 }
}

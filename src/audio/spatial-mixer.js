import {metalHissBuffer} from './metal-hiss.js';
import {impactDistance} from './impact-distance.js?v=seat-isolation';
import {powerSwitchBuffer} from './power-switch.js';
import {LocomotiveSpace} from './locomotive-space.js';
import {carriageGain,occupiedCarriage} from './carriage-isolation.js?v=coach61779';
export const MAX_IMPACT_VOICES=512;
/** Point contacts are fixed relative to an onboard listener; no artificial pass-by. */
export class SpatialMixer{
 constructor(context,bank,axles){
  Object.assign(this,{context,bank,axles});this.voices=new Set();this.emitters=new Map();this.muted=new Set();this.solo=null;this.levels={impact:1,rolling:1,brake:1,traction:.3};this.lastImpacts=new Map();
  this.master=context.createGain();this.master.gain.value=1;
  this.mixBoost=context.createGain();this.mixBoost.gain.value=1.4;
  this.compressor=context.createDynamicsCompressor();this.compressor.threshold.value=-8;this.compressor.knee.value=12;this.compressor.ratio.value=4;
  this.analyser=context.createAnalyser();this.analyser.fftSize=256;this.meterData=new Float32Array(256);
  this.outputFade=context.createGain();
  this.master.connect(this.mixBoost).connect(this.outputFade).connect(this.compressor).connect(this.analyser).connect(context.destination);
  for(const axle of axles)for(const side of ['left','right','center']){
   const pan=context.createPanner();pan.panningModel='HRTF';pan.distanceModel='inverse';pan.refDistance=3;pan.rolloffFactor=0;pan.positionX.value=side==='left'?-.76:side==='right'?.76:0;pan.positionY.value=-1.5;pan.positionZ.value=axle.offset;
   const gain=context.createGain();gain.connect(pan).connect(this.master);const impact=context.createGain(),metal=context.createGain();impact.connect(pan);metal.connect(pan);this.emitters.set(`${axle.id}:${side}`,{gain,pan,impact,metal});
  }
  this.locomotive=new LocomotiveSpace(context,this.master);
  this.setListener(10,0);
 }
 get audibleAxles(){return this.axles.filter(a=>this.transmission(a.id)>0);}
 transmission(id){const axle=this.axles.find(a=>a.id===id);return carriageGain(axle?.car??1,this.occupied??1);}
 setListener(seat,yaw){this.seat=seat;this.locomotive.setListener(seat);this.occupied=occupiedCarriage(seat);this.applyMute();const l=this.context.listener,a=yaw*Math.PI/180,t=this.context.currentTime;l.positionX.setTargetAtTime(0,t,.03);l.positionY.setTargetAtTime(0,t,.03);l.positionZ.setTargetAtTime(seat,t,.03);l.forwardX.setTargetAtTime(Math.sin(a),t,.03);l.forwardY.setTargetAtTime(0,t,.03);l.forwardZ.setTargetAtTime(-Math.cos(a),t,.03);l.upY.value=1;}
 setSpatial(enabled){this.locomotive.setSpatial(enabled);for(const {pan} of this.emitters.values())pan.panningModel=enabled?'HRTF':'equalpower';}
 isAudible(id){return this.transmission(id)>0&&!this.muted.has(id)&&(!this.solo||this.solo===id);}
 applyMute(){const t=this.context.currentTime;for(const [key,{gain,impact,metal}]of this.emitters){
  const id=key.split(':')[0],side=key.split(':')[1],axle=this.axles.find(a=>a.id===id),enabled=!this.muted.has(id)&&(!this.solo||this.solo===id);
  gain.gain.setTargetAtTime(this.isAudible(id)?this.transmission(id):0,t,.015);
  const levels=impactDistance(axle,this.seat,this.occupied,side);
  impact.gain.setTargetAtTime(enabled?levels.direct:0,t,.03);metal.gain.setTargetAtTime(enabled?levels.metal:0,t,.03);
 }}
 power(event,when,generation){
  const source=this.context.createBufferSource(),gain=this.context.createGain();
  source.buffer=powerSwitchBuffer(this.context,event.kind==='power_on');gain.gain.value=.6;
  source.connect(gain).connect(this.locomotive.input);
  const voice={source,gain,when,kind:event.kind,generation};this.voices.add(voice);
  source.onended=()=>{this.voices.delete(voice);source.disconnect();gain.disconnect();};
  source.start(Math.max(when,this.context.currentTime));
 }
 hit(event,when,generation){
  if(this.muted.has(event.wheelsetId)||(this.solo&&this.solo!==event.wheelsetId))return;
  if(this.voices.size>=MAX_IMPACT_VOICES){if(event.kind==='weld')return;const quiet=[...this.voices].find(v=>v.kind==='weld');if(quiet)this.stopVoice(quiet,this.context.currentTime);else return;}
  const sample=this.bank.select(event);if(!sample)return;
  const ctx=this.context,source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=sample.buffer;
  // Real alternate takes supply variation; playback-rate deviations stay subtle.
  const rate=1+((event.position%7)-3)*.003;source.playbackRate.value=rate;
  const start=Math.max(ctx.currentTime,when-(sample.onset||0)/rate),duration=sample.buffer.duration/rate;
  const level=(sample.gain??.45)*this.levels.impact*(event.kind==='weld'?.07:1)*(.12+.65*Math.sqrt(Math.min(1,event.speedMps/33.333)));
  gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(level,start+.002);gain.gain.setValueAtTime(level,start+Math.max(.003,duration-.025));gain.gain.linearRampToValueAtTime(0,start+duration);
  const emitter=this.emitters.get(`${event.wheelsetId}:${event.side}`);
  if(!emitter)return;
  source.connect(gain).connect(emitter.impact);
  const metalGain=ctx.createGain(),metalSource=ctx.createBufferSource();
  metalSource.buffer=metalHissBuffer(ctx,sample.buffer);metalSource.playbackRate.value=rate;
  const metalDuration=metalSource.buffer.duration/rate,metalLevel=level*.35*(this.levels.impactMetal??1);
  metalGain.gain.setValueAtTime(0,start);metalGain.gain.linearRampToValueAtTime(metalLevel,start+.002);
  metalGain.gain.setValueAtTime(metalLevel,start+metalDuration-.025);metalGain.gain.linearRampToValueAtTime(0,start+metalDuration);
  metalSource.connect(metalGain).connect(emitter.metal);
  const voice={source,gain,metalGain,metalSource,when,kind:event.kind,generation};this.voices.add(voice);
  source.onended=()=>{source.disconnect();gain.disconnect();};
  metalSource.onended=()=>{this.voices.delete(voice);metalSource.disconnect();metalGain.disconnect();};
  source.start(start);source.stop(start+duration+.01);
  metalSource.start(start);metalSource.stop(start+metalDuration+.01);
  this.lastImpacts.set(`${event.wheelsetId}:${event.side}`,when);
 }
 stopVoice(v,at){try{v.gain.gain.cancelScheduledValues(at);v.gain.gain.setTargetAtTime(0,at,.003);v.source.stop(at+.015);if(v.metalSource){v.metalGain.gain.cancelScheduledValues(at);v.metalGain.gain.setTargetAtTime(0,at,.003);v.metalSource.stop(at+.015);}}catch{}this.voices.delete(v);}
 cancelFrom(at){for(const v of this.voices)if(v.when>=at)this.stopVoice(v,this.context.currentTime);}
 silence(){for(const v of [...this.voices])this.stopVoice(v,this.context.currentTime);this.lastImpacts.clear();}
 peak(){this.analyser.getFloatTimeDomainData(this.meterData);let peak=0;for(const x of this.meterData)peak=Math.max(peak,Math.abs(x));return peak;}
 dispose(){
  this.silence();const t=this.context.currentTime;
  this.outputFade.gain.setValueAtTime(1,t);this.outputFade.gain.linearRampToValueAtTime(0,t+.03);
  setTimeout(()=>{this.locomotive.dispose();for(const {gain,pan,impact,metal} of this.emitters.values()){gain.disconnect();impact.disconnect();metal.disconnect();pan.disconnect();}this.master.disconnect();this.mixBoost.disconnect();this.outputFade.disconnect();this.compressor.disconnect();this.analyser.disconnect();},60);
 }
}

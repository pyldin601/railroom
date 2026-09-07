import {advanceMotion,initialState,stateInSegment} from '../simulation/motion.js';
import {findCrossings} from '../simulation/crossings.js';
/** Predict ahead on the audio clock; no animation-frame timing enters this class. */
export class Transport{
 constructor({clock,sink,route,axles,vehicle={}}){Object.assign(this,{clock,sink,route,axles,vehicle});this.state=initialState();this.controls={throttle:0,brake:0,emergency:false};this.segments=[];this.running=false;this.generation=0;this.underruns=0;this.origin=0;this.impacts=0;}
 snapshot(at=this.clock()){
  if(!this.running||!this.segments.length)return {...this.state};
  const time=at-this.origin;
  const segment=this.segments.find(s=>s.start.time+s.duration>=time-1e-10);
  if(!segment)return {...this.predicted};
  return stateInSegment(segment,time);
 }
 start(){if(this.running)return;this.origin=this.clock()+.06-this.state.time;this.predicted={...this.state};this.segments=[];this.running=true;this.generation++;this.tick();}
 pause(){if(this.running)this.state=this.snapshot();this.running=false;this.segments=[];this.sink.silence();}
 seek(position){this.pause();this.state=initialState(Math.max(0,Math.min(this.route.length,position)));this.generation++;}
 updateControls(controls){
  this.controls={...this.controls,...controls};
  if(!this.running)return;
  const effective=Math.min(this.clock()+.025,this.predicted.time+this.origin);
  const next=this.snapshot(effective);this.sink.cancelFrom(effective+1e-8);this.generation++;
  this.segments=this.segments.filter(s=>s.start.time<next.time).map(s=>({...s,duration:Math.min(s.duration,next.time-s.start.time)}));
  this.predicted=next;this.tick();
 }
 tick(){
  if(!this.running)return;
  const now=this.clock();
  if(now>this.predicted.time+this.origin+.025){this.state={...this.predicted};this.underruns++;this.pause();return;}
  const target=now+.15-this.origin;
  if(target<=this.predicted.time)return;
  const {state,segments}=advanceMotion(this.predicted,this.controls,target-this.predicted.time,{...this.vehicle,length:this.route.length});
  const events=findCrossings(segments,this.axles,this.route);
  for(const event of events){this.sink.hit(event,this.origin+event.simulationTime,this.generation);this.impacts++;}
  this.segments.push(...segments);this.predicted=state;
  this.segments=this.segments.filter(s=>s.start.time+s.duration>=now-this.origin-.2);
 }
}

import {DEFAULT_VEHICLE} from './simulation/motion.js?v=speed360';
import {drawRouteMap} from './ui/route-map.js?v=speed360';
import {createRenderLoop} from './ui/render-loop.js';
import {RouteIndex,demoRoute,wheelsets,listenerSeat} from './route/route-index.js?v=speed360';
import {Transport} from './audio/scheduler.js?v=horn';
import {SampleBank} from './audio/sample-bank.js';
import {SpatialMixer,MAX_IMPACT_VOICES} from './audio/spatial-mixer.js?v=smooth-end-hiss';
import {RollingLayers} from './audio/rolling.js?v=louder-neighbours';
import {drawTrack,wheelAt} from './ui/track-view.js?v=wheel-click';
const $=id=>document.getElementById(id);
let requestRender=()=>{};
function setText(id,text){const el=$(id),value=String(text);if(el.textContent!==value)el.textContent=value;}
let routeData,route,context,bank,mixer,rolling,transport,axles=wheelsets(Number($('cars').value)),seat=listenerSeat(Number($('cars').value)),loading=false,ready=false;
let emergency=false;const controls=()=>({throttle:Number($('throttle').value)/100,brake:Number($('brake').value)/100,emergency});
function error(message){$('error').textContent=message;$('error').hidden=!message;}
function setStatus(text){setText('status',text);requestRender();}
function displayRoute(){
 drawRouteMap($('route-map'),$('route-mode').value==='demo'?{length:route.length,stations:route.stations}:routeData);
 $('station').replaceChildren();
 for(const s of route.stations){const option=document.createElement('option');option.value=s.position;option.textContent=s.name;$('station').append(option);}
 $('route-caption').textContent=$('route-mode').value==='demo'?'25 m jointed test track · separate from the Kyiv route':'64 km · 25 m rails / welded strings ≤800 m · approximate route';
}
function buildAudio(position=0){
 rolling?.stop();mixer?.dispose();mixer=new SpatialMixer(context,bank,axles);mixer.motorMode=$('motor-mode').value;rolling=new RollingLayers(context,bank,mixer);
 const sink={horn:(...args)=>mixer.horn(...args),power:(...args)=>mixer.power(...args),hit:(...args)=>mixer.hit(...args),cancelFrom:t=>mixer.cancelFrom(t),silence:()=>{mixer.silence();rolling.stop();}};
 transport=new Transport({clock:()=>context.currentTime,sink,route,axles});transport.seek(position);transport.updateControls(controls());mixer.master.gain.value=Number($('master').value)/100;mixer.setListener(seat,Number($('yaw').value));mixer.setSpatial($('spatial').checked);
 for(const kind of ['impact','impactMetal','rolling','rollingLow','rollingHigh','ambient','traction','brake'])mixer.levels[kind]=Number($(kind+'-mix').value)/100;
}
async function enableAudio(){
 if(bank)return;if(loading)throw new Error('Audio is still loading');loading=true;$('play').disabled=true;setStatus('Loading recorded sounds');
 try{context ||= new AudioContext({latencyHint:'interactive'});await context.resume();const nextBank=new SampleBank(context);await nextBank.load();bank=nextBank;buildAudio(pendingPosition);$('sound-note').textContent=$('motor-mode').value==='recorded'?'Recorded motor tone · pitch follows speed':'Live motor synthesis · recorded wheel impacts, rolling and braking';}
 finally{loading=false;$('play').disabled=!ready;}
}
async function play(audition=false){
 if(loading||!ready)return;
 try{error('');await enableAudio();await context.resume();
  if(audition){transport.pause();$('route-mode').value='demo';route=new RouteIndex(demoRoute());displayRoute();buildAudio();transport.state.speed=20;$('throttle').value=0;$('brake').value=0;emergency=false;updateControls();}
  else if(transport.running){transport.pause();setStatus('Paused');return;}
  rolling.start();transport.start();setStatus('Running');
 }catch(e){error(e.message);setStatus('Audio unavailable');}
}
function disableAutopilot(){
 if(transport?.autopilot){transport.setAutopilot(false);$('throttle').value=0;$('brake').value=0;}
 $('autopilot').setAttribute('aria-pressed','false');$('autopilot-status').hidden=true;
}
$('autopilot').onclick=async()=>{
 if(loading||!ready)return;
 if(transport?.autopilot){disableAutopilot();updateControls();return;}
 try{await enableAudio();await context.resume();emergency=false;transport.setAutopilot(true);$('autopilot').setAttribute('aria-pressed','true');$('autopilot-status').hidden=false;if(!transport.running){rolling.start();transport.start();}setStatus('Autopilot');}catch(e){error(e.message);}
};
for(const id of ['throttle','brake']){
 $(id).addEventListener('pointerdown',()=>{disableAutopilot();updateControls();});
 $(id).addEventListener('keydown',()=>disableAutopilot());
 $(id).addEventListener('input',()=>{if(transport?.autopilot){const value=$(id).value;disableAutopilot();$(id).value=value;}});
}
for(const id of ['coast','emergency','reset','seek','audition'])$(id).addEventListener('click',disableAutopilot);
for(const id of ['route-mode','cars'])$(id).addEventListener('change',disableAutopilot);
function updateControls(){
 $('throttle-value').textContent=$('throttle').value+'%';$('brake-value').textContent=$('brake').value+'%';$('emergency').classList.toggle('active',emergency);$('emergency').setAttribute('aria-pressed',String(emergency));transport?.updateControls(controls());
}
async function soundHorn(){
 if(!ready||loading)return;
 try{error('');await enableAudio();await context.resume();mixer.horn(context.currentTime,transport.generation);if(!transport.running)setStatus('Ready');requestRender();}catch(e){error(e.message);}
}
$('horn').onclick=soundHorn;
$('track').onclick=async event=>{
 if(!ready||loading)return;
 const canvas=$('track'),rect=canvas.getBoundingClientRect();
 const hit=wheelAt(canvas.clientWidth,canvas.clientHeight,axles,(event.clientX-rect.left)*canvas.clientWidth/rect.width,(event.clientY-rect.top)*canvas.clientHeight/rect.height);
 if(!hit)return;
 try{
  error('');await enableAudio();await context.resume();
  if(!axles.some(a=>a.id===hit.axle.id))return;
  const state=transport.snapshot();
  mixer.hit({kind:'joint',wheelsetId:hit.axle.id,side:hit.side,offset:hit.axle.offset,position:state.position,objectId:`audition-${hit.axle.id}-${hit.side}`,speedMps:state.speed>0?state.speed:20},context.currentTime+.015,transport.generation);
  requestRender();setTimeout(requestRender,30);setTimeout(requestRender,160);
 }catch(e){error(e.message);}
};
$('play').onclick=()=>play();$('audition').onclick=()=>play(true);
$('throttle').oninput=()=>{emergency=false;updateControls();};$('brake').oninput=()=>{emergency=false;updateControls();};
$('coast').onclick=()=>{$('throttle').value=0;$('brake').value=0;emergency=false;updateControls();};
$('emergency').onclick=()=>{emergency=!emergency;if(emergency){$('throttle').value=0;$('brake').value=100;}updateControls();};
$('reset').onclick=()=>{pendingPosition=0;transport?.seek(0);emergency=false;$('brake').value=0;updateControls();setStatus('Ready');};
$('seek').onclick=()=>{transport?.seek(Number($('station').value));if(!transport){pendingPosition=Number($('station').value);}setStatus('Ready at station');};
let pendingPosition=0;
$('route-mode').onchange=()=>{transport?.pause();route=$('route-mode').value==='demo'?new RouteIndex(demoRoute()):new RouteIndex(routeData);pendingPosition=0;displayRoute();if(bank)buildAudio();setStatus('Ready');};
$('cars').onchange=()=>{const position=transport?.snapshot().position??pendingPosition;transport?.pause();axles=wheelsets(Number($('cars').value));seat=listenerSeat(axles.length/4,Number($('seats').querySelector('.selected').dataset.seat));$('seat-label').textContent=`Seat position · carriage ${Math.min(axles.length/4,5)} of ${axles.length/4}`;if(bank)buildAudio(position);setStatus('Ready');};
$('master').oninput=()=>{$('master-value').textContent=$('master').value+'%';if(mixer)mixer.master.gain.setTargetAtTime(Number($('master').value)/100,context.currentTime,.03);};
$('yaw').oninput=()=>{$('yaw-value').textContent=$('yaw').value+'°';mixer?.setListener(seat,Number($('yaw').value));};
for(const button of $('seats').children)button.onclick=()=>{seat=listenerSeat(axles.length/4,Number(button.dataset.seat));for(const b of $('seats').children){b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));}mixer?.setListener(seat,Number($('yaw').value));};
$('motor-mode').onchange=()=>{rolling?.setMotorMode($('motor-mode').value);$('sound-note').textContent=$('motor-mode').value==='recorded'?'Recorded motor tone · pitch follows speed':'Live motor synthesis · recorded wheel impacts, rolling and braking';};
$('spatial').onchange=()=>mixer?.setSpatial($('spatial').checked);
for(const kind of ['impact','impactMetal','rolling','rollingLow','rollingHigh','ambient','traction','brake'])$(kind+'-mix').oninput=()=>{if(mixer)mixer.levels[kind]=Number($(kind+'-mix').value)/100;};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','SUMMARY','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='KeyH'&&!e.repeat){e.preventDefault();soundHorn();}if(e.code==='Space'){e.preventDefault();play();}if(e.code==='ArrowUp'||e.code==='ArrowDown'){e.preventDefault();disableAutopilot();$('throttle').value=Math.max(0,Math.min(100,Number($('throttle').value)+(e.code==='ArrowUp'?5:-5)));updateControls();}if(e.code==='KeyB'){disableAutopilot();$('brake').value=Math.min(100,Number($('brake').value)+10);updateControls();}});
setInterval(()=>{
 if(!transport)return;const wasRunning=transport.running;transport.tick();const snapshot=transport.snapshot();rolling.update(snapshot,{...transport.controls,powerAvailable:route.powerAt(snapshot.position)},transport.running);
 if(wasRunning&&!transport.running)setStatus('Paused · audio timing interruption');
 if(context.state!=='running'&&transport.running){transport.pause();setStatus('Paused · audio interrupted');}
},25);
function render(){
 if(route){const state=transport?.snapshot()||{position:pendingPosition,speed:0,acceleration:0};const running=!!transport?.running;
  if(transport?.autopilot){const c=transport.controls;$('throttle').value=Math.round(c.throttle*100);$('brake').value=Math.round(c.brake*100);setText('throttle-value',$('throttle').value+'%');setText('brake-value',$('brake').value+'%');setText('autopilot-status',transport.autopilot.status);}
  if(state.air)setText('air-status',`Brake cylinders ${state.air.cylinder.toFixed(1)} bar · air ${state.air.reservoir.toFixed(1)} bar${state.air.compressor?' · compressor on':''}`);
  setText('speed',Math.round(state.speed*3.6));$('speed-bar').style.width=`${Math.min(1,state.speed/DEFAULT_VEHICLE.maxSpeed)*100}%`;setText('distance',`${(state.position/1000).toFixed(3)} / 64.000 km`);
  $('route-head').style.left=`${state.position/route.length*100}%`;
  const next=route.stations.find(s=>s.position>state.position+.1);setText('next-station',next?.name||'End of route');setText('next-distance',next?`${((next.position-state.position)/1000).toFixed(2)} km`:'Arrived');
  setText('play-label',running?'Pause journey':state.position||state.speed?'Resume journey':'Start journey');setText('play-icon',running?'Ⅱ':'▶');$('status-dot').classList.toggle('running',running);
  setText('motion-label',!running?'PAUSED':state.position>=route.length?'END OF ROUTE':state.speed<.05?'STATIONARY':emergency?'EMERGENCY':Number($('brake').value)>0?'BRAKING':state.acceleration>.01?'ACCELERATING':'COASTING');
  drawTrack($('track'),state,axles,route,mixer,seat);
  if(mixer){const peak=mixer.peak();$('meter').style.width=`${Math.min(100,peak*100)}%`;setText('peak',peak>1e-6?`${(20*Math.log10(peak)).toFixed(1)} dB`:'−∞ dB');$('meter').style.background=peak>.9?'var(--red)':'var(--mint)';
   setText('diagnostics',`${context.sampleRate} Hz · ${mixer.voices.size}/${MAX_IMPACT_VOICES} impact voices · ${axles.length} wheelsets · ${transport.underruns} scheduling interruptions · ${Math.round((context.baseLatency||0)*1000)} ms base latency · ${route.events.length} route contacts`);
  }
 }
 return !!transport?.running;
}
try{const r=await fetch('./public/route.json');if(!r.ok)throw new Error('Route asset could not be loaded');routeData=await r.json();route=new RouteIndex(routeData);displayRoute();ready=true;$('play').disabled=false;setStatus('Ready · headphones recommended');}catch(e){error(e.message);setStatus('Route unavailable');}
requestRender=createRenderLoop(render);
for(const event of ['input','change','click'])document.addEventListener(event,()=>{requestRender();setTimeout(requestRender,160);});
document.addEventListener('visibilitychange',requestRender);
document.addEventListener('keydown',requestRender);
new ResizeObserver(requestRender).observe($('track'));
requestRender();

import {RouteIndex,demoRoute,wheelsets} from './route/route-index.js';
import {Transport} from './audio/scheduler.js';
import {SampleBank} from './audio/sample-bank.js';
import {SpatialMixer} from './audio/spatial-mixer.js';
import {RollingLayers} from './audio/rolling.js';
import {drawTrack} from './ui/track-view.js';
const $=id=>document.getElementById(id);
let routeData,route,context,bank,mixer,rolling,transport,axles=wheelsets(),seat=10,loading=false,ready=false;
let emergency=false;const controls=()=>({throttle:Number($('throttle').value)/100,brake:Number($('brake').value)/100,emergency});
function error(message){$('error').textContent=message;$('error').hidden=!message;}
function setStatus(text){$('status').textContent=text;}
function displayRoute(){
 $('route-map').replaceChildren();$('station').replaceChildren();
 route.stations.forEach((s,i)=>{const marker=document.createElement('div');marker.className='station-marker';marker.style.left=`${s.position/route.length*100}%`;const dot=document.createElement('i'),label=document.createElement('span');label.textContent=s.name.replace('Kyiv-Pasazhyrskyi','Kyiv-Pas.');marker.append(dot,label);$('route-map').append(marker);const option=document.createElement('option');option.value=s.position;option.textContent=s.name;$('station').append(option);});
 const head=document.createElement('i');head.id='route-head';head.className='route-head';$('route-map').append(head);
 $('route-caption').textContent=$('route-mode').value==='demo'?'25 m jointed test track · separate from the Kyiv route':'64 km · 8 station markers · approximate route';
}
function axleButtons(){
 $('axle-grid').replaceChildren();for(const axle of axles){const cell=document.createElement('div');cell.className='axle-cell';cell.id=`cell-${axle.id}`;const mute=document.createElement('button'),solo=document.createElement('button');mute.textContent=axle.label;mute.title=`Mute wheelset ${axle.label}`;mute.setAttribute('aria-pressed','false');solo.textContent='S';solo.title=`Solo wheelset ${axle.label}`;solo.setAttribute('aria-pressed','false');
  mute.onclick=()=>{if(!mixer)return;if(mixer.muted.has(axle.id))mixer.muted.delete(axle.id);else mixer.muted.add(axle.id);mixer.applyMute();cell.classList.toggle('muted',mixer.muted.has(axle.id));mute.setAttribute('aria-pressed',String(mixer.muted.has(axle.id)));};
  solo.onclick=()=>{if(!mixer)return;mixer.solo=mixer.solo===axle.id?null:axle.id;mixer.applyMute();for(const a of axles){const el=$(`cell-${a.id}`);el.classList.toggle('solo',mixer.solo===a.id);el.children[1].setAttribute('aria-pressed',String(mixer.solo===a.id));}};cell.append(mute,solo);$('axle-grid').append(cell);
 }
}
function buildAudio(position=0){
 rolling?.stop();mixer?.dispose();mixer=new SpatialMixer(context,bank,axles);rolling=new RollingLayers(context,bank,mixer);
 const sink={hit:(...args)=>mixer.hit(...args),cancelFrom:t=>mixer.cancelFrom(t),silence:()=>{mixer.silence();rolling.stop();}};
 transport=new Transport({clock:()=>context.currentTime,sink,route,axles});transport.seek(position);transport.updateControls(controls());mixer.master.gain.value=Number($('master').value)/100;mixer.setListener(seat,Number($('yaw').value));mixer.setSpatial($('spatial').checked);
 for(const kind of ['impact','rolling','traction','brake'])mixer.levels[kind]=Number($(kind+'-mix').value)/100;axleButtons();
}
async function enableAudio(){
 if(bank)return;if(loading)throw new Error('Audio is still loading');loading=true;$('play').disabled=true;setStatus('Loading recorded sounds');
 try{context ||= new AudioContext({latencyHint:'interactive'});await context.resume();const nextBank=new SampleBank(context);await nextBank.load();bank=nextBank;buildAudio(pendingPosition);$('sound-note').textContent='11 recorded samples · individual wheelset impacts · electric traction and braking';}
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
function updateControls(){
 $('throttle-value').textContent=$('throttle').value+'%';$('brake-value').textContent=$('brake').value+'%';$('emergency').classList.toggle('active',emergency);$('emergency').setAttribute('aria-pressed',String(emergency));transport?.updateControls(controls());
}
$('play').onclick=()=>play();$('audition').onclick=()=>play(true);
$('throttle').oninput=()=>{emergency=false;updateControls();};$('brake').oninput=()=>{emergency=false;updateControls();};
$('coast').onclick=()=>{$('throttle').value=0;$('brake').value=0;emergency=false;updateControls();};
$('emergency').onclick=()=>{emergency=!emergency;if(emergency){$('throttle').value=0;$('brake').value=100;}updateControls();};
$('reset').onclick=()=>{pendingPosition=0;transport?.seek(0);emergency=false;$('brake').value=0;updateControls();setStatus('Ready');};
$('seek').onclick=()=>{transport?.seek(Number($('station').value));if(!transport){pendingPosition=Number($('station').value);}setStatus('Ready at station');};
let pendingPosition=0;
$('route-mode').onchange=()=>{transport?.pause();route=$('route-mode').value==='demo'?new RouteIndex(demoRoute()):new RouteIndex(routeData);pendingPosition=0;displayRoute();if(bank)buildAudio();setStatus('Ready');};
$('cars').onchange=()=>{const position=transport?.snapshot().position??pendingPosition;transport?.pause();axles=wheelsets(Number($('cars').value));if(bank)buildAudio(position);else axleButtons();setStatus('Ready');};
$('master').oninput=()=>{$('master-value').textContent=$('master').value+'%';if(mixer)mixer.master.gain.setTargetAtTime(Number($('master').value)/100,context.currentTime,.03);};
$('yaw').oninput=()=>{$('yaw-value').textContent=$('yaw').value+'°';mixer?.setListener(seat,Number($('yaw').value));};
for(const button of $('seats').children)button.onclick=()=>{seat=Number(button.dataset.seat);for(const b of $('seats').children){b.classList.toggle('selected',b===button);b.setAttribute('aria-pressed',String(b===button));}mixer?.setListener(seat,Number($('yaw').value));};
$('spatial').onchange=()=>mixer?.setSpatial($('spatial').checked);
for(const kind of ['impact','rolling','traction','brake'])$(kind+'-mix').oninput=()=>{if(mixer)mixer.levels[kind]=Number($(kind+'-mix').value)/100;};
document.addEventListener('keydown',e=>{if(['INPUT','SELECT','BUTTON','SUMMARY','TEXTAREA'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();play();}if(e.code==='ArrowUp'||e.code==='ArrowDown'){e.preventDefault();$('throttle').value=Math.max(0,Math.min(100,Number($('throttle').value)+(e.code==='ArrowUp'?5:-5)));updateControls();}if(e.code==='KeyB'){$('brake').value=Math.min(100,Number($('brake').value)+10);updateControls();}});
setInterval(()=>{
 if(!transport)return;const wasRunning=transport.running;transport.tick();rolling.update(transport.snapshot(),transport.controls,transport.running);
 if(wasRunning&&!transport.running)setStatus('Paused · audio timing interruption');
 if(context.state!=='running'&&transport.running){transport.pause();setStatus('Paused · audio interrupted');}
},25);
function render(){
 if(route){const state=transport?.snapshot()||{position:pendingPosition,speed:0,acceleration:0};const running=!!transport?.running;
  $('speed').textContent=Math.round(state.speed*3.6);$('speed-bar').style.width=`${state.speed*3.6/120*100}%`;$('distance').textContent=`${(state.position/1000).toFixed(3)} / 64.000 km`;
  $('route-head').style.left=`${state.position/route.length*100}%`;
  const next=route.stations.find(s=>s.position>state.position+.1);$('next-station').textContent=next?.name||'End of route';$('next-distance').textContent=next?`${((next.position-state.position)/1000).toFixed(2)} km`:'Arrived';
  $('play-label').textContent=running?'Pause journey':state.position||state.speed?'Resume journey':'Start journey';$('play-icon').textContent=running?'Ⅱ':'▶';$('status-dot').classList.toggle('running',running);
  $('motion-label').textContent=!running?'PAUSED':state.position>=route.length?'END OF ROUTE':state.speed<.05?'STATIONARY':emergency?'EMERGENCY':Number($('brake').value)>0?'BRAKING':state.acceleration>.01?'ACCELERATING':'COASTING';
  drawTrack($('track'),state,axles,route,mixer,seat);
  if(mixer){const peak=mixer.peak();$('meter').style.width=`${Math.min(100,peak*100)}%`;$('peak').textContent=peak>1e-6?`${(20*Math.log10(peak)).toFixed(1)} dB`:'−∞ dB';$('meter').style.background=peak>.9?'var(--red)':'var(--mint)';
   for(const a of axles){const at=Math.max(mixer.lastImpacts.get(`${a.id}:left`)??-Infinity,mixer.lastImpacts.get(`${a.id}:right`)??-Infinity);$(`cell-${a.id}`).classList.toggle('flash',context.currentTime>=at&&context.currentTime-at<.12);}
   $('diagnostics').textContent=`${context.sampleRate} Hz · ${mixer.voices.size}/128 impact voices · ${axles.length} wheelsets · ${transport.underruns} scheduling interruptions · ${Math.round((context.baseLatency||0)*1000)} ms base latency · ${route.events.length} route contacts`;
  }
 }
 requestAnimationFrame(render);
}
try{const r=await fetch('./public/route.json');if(!r.ok)throw new Error('Route asset could not be loaded');routeData=await r.json();route=new RouteIndex(routeData);displayRoute();axleButtons();ready=true;$('play').disabled=false;setStatus('Ready · headphones recommended');}catch(e){error(e.message);setStatus('Route unavailable');}
render();

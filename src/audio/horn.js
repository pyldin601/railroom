// Designed two-tone pneumatic horn: harmonic body, gentle air texture and
// pressure-shaped attack/release. Cached once per audio context.
const buffers=new WeakMap();
export function hornDistanceGain(seat){return 1/(1+Math.hypot(seat+14,.7,.5)/28);}
export function hornBuffer(context){
 if(buffers.has(context))return buffers.get(context);
 const rate=context.sampleRate,duration=1.3,buffer=context.createBuffer(1,Math.ceil(rate*(duration+2.8)),rate),data=buffer.getChannelData(0);
 let seed=739,air=0;
 for(let i=0;i<Math.ceil(rate*duration);i++){
  const t=i/rate,attack=Math.min(1,t/.075),release=Math.max(0,Math.min(1,(duration-t)/.3));
  const envelope=Math.sin(attack*Math.PI/2)**2*release**2;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;air+=.3*(seed/2147483648-1-air);
  let tone=0;
  for(const f of [370,494])for(let h=1;h<=6;h++)tone+=Math.sin(2*Math.PI*f*h*t+.018*h*Math.sin(2*Math.PI*4.7*t))/(h**1.4)*.13;
  data[i]=envelope*(tone+.025*air);
 }
 // Diffuse 2.4-second RT60 reverb, baked into the cached sound so its tail
 // follows the same spatial path and is cancelled together with the horn.
 const wet=new Float32Array(data.length);
 for(const ms of [43.7,53.1,59.3,67.7,71.9,79.7,89.3,97.1]){
  const n=Math.round(rate*ms/1000),feedback=10**(-3*n/rate/2.4),delay=new Float32Array(n);
  for(let i=0;i<data.length;i++){const j=i%n,y=delay[j];delay[j]=data[i]+feedback*y;wet[i]+=.25*y;}
 }
 for(const ms of [11.3,7.1,5,1.7]){
  const n=Math.round(rate*ms/1000),delay=new Float32Array(n);
  for(let i=0;i<wet.length;i++){const j=i%n,x=wet[i],y=delay[j]-.5*x;delay[j]=x+.5*y;wet[i]=y;}
 }
 // Darken and soften the diffuse tail while letting it dominate the dry horn.
 const smoothing=1-Math.exp(-2*Math.PI*1800/rate);let softened=0;
 for(let i=0;i<data.length;i++){
  softened+=smoothing*(wet[i]-softened);
  data[i]=.65*data[i]+.7*softened*Math.min(1,(data.length-1-i)/(rate*.2));
 }
 buffers.set(context,buffer);return buffer;
}

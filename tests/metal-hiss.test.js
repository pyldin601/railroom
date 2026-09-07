import test from 'node:test';
import assert from 'node:assert/strict';
import {metalHissSamples} from '../src/audio/metal-hiss.js';
test('metal hiss rejects bass and retains a decaying reverb tail',()=>{
 const rate=48000;
 const tone=f=>Float32Array.from({length:rate},(_,i)=>Math.sin(2*Math.PI*f*i/rate));
 const rms=x=>Math.sqrt(x.slice(24000,48000).reduce((s,v)=>s+v*v,0)/24000);
 assert.ok(rms(metalHissSamples(tone(100),rate))<rms(metalHissSamples(tone(8000),rate))*.01);
 const impulse=new Float32Array(4800);impulse[0]=1;
 const out=metalHissSamples(impulse,rate);
 const energy=(a,b)=>out.slice(a*rate,b*rate).reduce((s,v)=>s+v*v,0);
 assert.ok(energy(.2,.3)>0);
 assert.ok(energy(.5,.6)<energy(.2,.3)*.002);
 assert.ok(out.every(Number.isFinite));
});

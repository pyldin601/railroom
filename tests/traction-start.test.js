import test from 'node:test';import assert from 'node:assert/strict';
import {TractionMotor,motorParameters} from '../src/audio/traction.js';
function fixture(){
 const param=value=>({value,events:[],setValueAtTime(v){this.value=v;this.events.push(['set',v]);},setTargetAtTime(v){this.events.push(['target',v]);}});
 const node=()=>({frequency:param(440),detune:param(0),gain:param(1),Q:param(1),connect(){return this;},disconnect(){},setPeriodicWave(){},start(){this.startFrequency=this.frequency.value;},stop(){}});
 const ctx={currentTime:0,createPeriodicWave(){},createOscillator:node,createGain:node,createBiquadFilter:node};
 const mixer={axles:[{id:'a'}],levels:{traction:1},emitters:new Map([['a:center',{gain:node()}]])};
 return new TractionMotor(ctx,mixer);
}
test('motor starts at its intended pitch rather than gliding from 440 Hz',()=>{
 const motor=fixture();motor.start();const v=motor.voices[0],p=motorParameters(0,0);
 assert.equal(v.carrier.startFrequency,p.electrical);assert.equal(v.gear.startFrequency,p.gear);assert.equal(v.body.startFrequency,p.body);
});
test('first update initializes the resumed pitch but later speed changes glide',()=>{
 const motor=fixture();motor.start();motor.update({speed:20},{throttle:.5},true);const v=motor.voices[0];
 assert.deepEqual(v.carrier.frequency.events.at(-1),['set',motorParameters(20,.5).electrical]);
 assert.equal(v.gain.gain.events.at(-1)[0],'target','volume still fades in');
 motor.update({speed:21},{throttle:.5},true);assert.equal(v.carrier.frequency.events.at(-1)[0],'target');
});

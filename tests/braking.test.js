import test from 'node:test';import assert from 'node:assert/strict';
import {brakeParameters,BrakingLayers} from '../src/audio/braking.js';
test('brake tone pitch follows actual speed without a time-driven deceleration loop',()=>{
 let prior=Infinity;for(let speed=33;speed>=0;speed--){const p=brakeParameters({speed},{brake:.6},true);assert.ok(p.rate<=prior);prior=p.rate;}
 assert.deepEqual(brakeParameters({speed:20},{brake:.5},true),brakeParameters({speed:20},{brake:.5},true));
});
test('braking fades near stop and pressure controls level independently of pitch',()=>{
 for(const [s,c,r] of [[20,{},true],[0,{brake:1},true],[20,{brake:1},false]])assert.equal(brakeParameters({speed:s},c,r).load,0);
 assert.ok(brakeParameters({speed:.1},{brake:1},true).load<.1);
 assert.equal(brakeParameters({speed:20},{emergency:true},true).load,1);
 assert.equal(brakeParameters({speed:20},{brake:.2},true).rate,brakeParameters({speed:20},{brake:1},true).rate);
});
test('tone and hiss are separate profiles; only tone changes pitch',()=>{
 const b=new BrakingLayers({}, {}, {occupied:5});
 assert.equal(b.tone.profile.kind,'brake-tone');assert.equal(b.hiss.profile.kind,'brake-hiss');
 assert.equal(b.hiss.profile.parameters({speed:5},{brake:1},true).rate,1);
 assert.equal(b.hiss.profile.parameters({speed:30},{brake:1},true).rate,1);
 const v={index:0};assert.notEqual(b.hiss.profile.offset(v,4),b.hiss.profile.offset(v,4));
});

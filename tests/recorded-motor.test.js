import test from 'node:test';import assert from 'node:assert/strict';
import {sourcePosition,grainWindow,alignGrain,textureNormalization} from '../src/audio/recorded-motor.js';
test('steady speed holds the same source region indefinitely',()=>{const positions=Array.from({length:1000},()=>sourcePosition(15,3.85));assert.equal(new Set(positions).size,1);});
test('source follows speed monotonically without wrapping to beginning',()=>{let previous=-1;for(let v=0;v<=150;v++){let p=sourcePosition(v/3.6,3.85);assert.ok(p>=previous);assert.ok(p+.18<=3.85);previous=p;}});
test('three overlapping Hann grains have constant summed envelope',()=>{for(let t=.001;t<.06;t+=.001){const sum=[t,t+.06,t+.12].reduce((s,t)=>s+grainWindow(t/.18),0);assert.ok(Math.abs(sum-1)<1e-10);}});
test('phase alignment stays within valid source bounds',()=>{const data=Float32Array.from({length:48000},(_,i)=>Math.sin(i*.02));const p=alignGrain(data,48000,.3,.2);assert.ok(Math.abs(p-.3)<=.006);});

test('quiet recording regions get bounded loudness matching',()=>{assert.equal(textureNormalization(new Float32Array(48000),48000,.2),4);assert.ok(textureNormalization(new Float32Array(48000).fill(.2),48000,.2)<1);});

import test from 'node:test';
import assert from 'node:assert/strict';
import {motorParameters} from '../src/audio/traction.js';
test('motor pitch follows speed rather than a repeating clip',()=>{const a=motorParameters(2,1),b=motorParameters(20,1);assert.ok(b.electrical>a.electrical);assert.ok(b.gear>a.gear);});
test('throttle controls motor load and harmonic richness',()=>{const a=motorParameters(10,.2),b=motorParameters(10,1);assert.ok(b.gain>a.gain);assert.ok(b.deviation>a.deviation);});
test('coasting and braking remove powered traction',()=>{assert.equal(motorParameters(20,0).gain,0);assert.equal(motorParameters(20,1,1).gain,0);});
test('motor parameters stay finite and bounded over the speed range',()=>{for(let v=0;v<=40;v+=.1)for(const x of Object.values(motorParameters(v,1))){assert.ok(Number.isFinite(x));assert.ok(x>=0&&x<5000);}});

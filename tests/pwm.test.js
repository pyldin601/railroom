import test from 'node:test';import assert from 'node:assert/strict';
import {pwmParameters,PWM_CARRIERS,PWM_STEP_MPS} from '../src/audio/pwm.js';
test('PWM holds its carrier stage while electrical harmonics move',()=>{
 const a=pwmParameters(.1,{throttle:1},true),b=pwmParameters(.3,{throttle:1},true);
 assert.equal(a.stage,b.stage);assert.ok(b.electrical>a.electrical);
 assert.equal(PWM_CARRIERS.length,14);assert.equal(pwmParameters(25,{},true).stage,13);
});
test('PWM transitions have hysteresis to prevent flutter at speed boundaries',()=>{
 assert.equal(pwmParameters(PWM_STEP_MPS+.02,{},true,0).stage,0);assert.equal(pwmParameters(PWM_STEP_MPS+.05,{},true,0).stage,1);
 assert.equal(pwmParameters(PWM_STEP_MPS-.02,{},true,1).stage,1);assert.equal(pwmParameters(PWM_STEP_MPS-.05,{},true,1).stage,0);
});
test('PWM responds to acceleration and braking, silent during coast, pause and braking at rest',()=>{
 assert.ok(pwmParameters(20,{throttle:1},true).gain>0);
 assert.ok(pwmParameters(20,{brake:.5},true).gain>0);
 assert.equal(pwmParameters(20,{},true).gain,0);
 assert.equal(pwmParameters(20,{throttle:1},false).gain,0);
 assert.equal(pwmParameters(0,{brake:1},true).gain,0);
});

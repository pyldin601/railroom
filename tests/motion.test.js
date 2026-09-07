import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceMotion, initialState, DEFAULT_VEHICLE, stateInSegment} from '../src/simulation/motion.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const ideal={...DEFAULT_VEHICLE,jerk:Infinity,resistance:0,drag:0,tractionFade:0,maxSpeed:100,traction:0.5,serviceBrake:1};
test('0.5 m/s² for ten seconds gives 25 m and 5 m/s',()=>{let {state}=advanceMotion(initialState(),{throttle:1},10,ideal);close(state.position,25);close(state.speed,5);});
test('braking integrates exact stop without reversing',()=>{let {state}=advanceMotion({...initialState(),air:{...initialState().air,cylinder:4},speed:20},{brake:1},30,ideal);close(state.position,200);close(state.speed,0);});
test('brake wins over throttle',()=>{let a=advanceMotion({...initialState(),air:{...initialState().air,cylinder:4},speed:10},{throttle:1,brake:1},1,ideal);close(a.state.speed,9);});
test('normal acceleration respects jerk limit',()=>{let a=advanceMotion(initialState(),{throttle:1},.1);assert.ok(a.state.acceleration<=.030001);});
test('endpoint clamps position and speed',()=>{let a=advanceMotion({...initialState(),position:99,speed:20},{},1,{...ideal,length:100});close(a.state.position,100);close(a.state.speed,0);});
test('speed cap does not create overshoot or lose distance',()=>{let a=advanceMotion({...initialState(),speed:9.9},{throttle:1},1,{...ideal,maxSpeed:10});close(a.state.speed,10);close(a.state.position,9.99);});
test('state interpolation uses the same quadratic trajectory',()=>{let {segments}=advanceMotion(initialState(),{throttle:1},.01,ideal);let s=stateInSegment(segments[0],.005);close(s.position,.00000625);});
test('default train reaches and holds its 360 km/h ceiling',()=>{
 const result=advanceMotion({...initialState(),speed:99.9,acceleration:.2},{throttle:1},5);
 close(result.state.speed,100);
 assert.ok(result.state.position>499);
});

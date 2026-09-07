import test from 'node:test';import assert from 'node:assert/strict';
import {createRenderLoop} from '../src/ui/render-loop.js';
function setup(){let active=false,visible=true,draws=0;const frames=[],timers=new Map();let id=0;
 const invalidate=createRenderLoop(()=>{draws++;return active;},{frame:fn=>frames.push(fn),timer:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},cancelTimer:id=>timers.delete(id),visible:()=>visible});
 return {invalidate,frames,timers,get draws(){return draws;},set active(v){active=v;},set visible(v){visible=v;}};
}
test('paused UI draws only on invalidation and coalesces changes',()=>{const x=setup();x.invalidate();x.invalidate();assert.equal(x.frames.length,1);x.frames.shift()();assert.equal(x.draws,1);assert.equal(x.timers.size,0);});
test('active UI is rate limited and stops scheduling when paused',()=>{const x=setup();x.active=true;x.invalidate();x.frames.shift()();assert.equal([...x.timers.values()][0].ms,1000/30);x.active=false;x.invalidate();assert.equal(x.timers.size,0);x.frames.shift()();assert.equal(x.timers.size,0);});
test('hidden UI draws nothing until explicitly invalidated on return',()=>{const x=setup();x.visible=false;x.invalidate();assert.equal(x.frames.length,0);x.visible=true;x.invalidate();x.frames.shift()();assert.equal(x.draws,1);});

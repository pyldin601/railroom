import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {Autopilot} from '../src/simulation/autopilot.js';import {advanceMotion,initialState} from '../src/simulation/motion.js';import {RouteIndex} from '../src/route/route-index.js';
test('autopilot completes all stops with minute dwells, mild braking and anticipates limits',()=>{
 const route=new RouteIndex(JSON.parse(fs.readFileSync(new URL('../public/route.json',import.meta.url))));
 let state=initialState(),pilot=new Autopilot(route,state,261),arrivals=[],lastIndex=0,pilotPreviousArrival=0,maxOverspeed=0,maxArrivalSpeed=0;
 for(let i=0;i<180000&&pilot.index<pilot.stops.length;i++){
  const controls=pilot.update(state);assert.ok(controls.brake<=.4);assert.equal(controls.emergency,false);
  if(pilot.index!==lastIndex){assert.ok(state.time-pilotPreviousArrival>=60-1e-6);lastIndex=pilot.index;}
  if(pilot.arrivedAt!==null&&arrivals.length===pilot.index){arrivals.push(state.position);pilotPreviousArrival=pilot.arrivedAt;}
  const next=advanceMotion(state,controls,.1,{length:controls.stopPosition,powerAt:p=>route.powerAt(p),nextPower:p=>route.nextPower(p)});
  if(next.state.position===controls.stopPosition&&state.position<controls.stopPosition)maxArrivalSpeed=Math.max(maxArrivalSpeed,state.speed);
  state=next.state;
  const limit=route.speedMarkers.find(m=>state.position>=m.position&&state.position<m.endPosition)?.speedKmh/3.6;
  if(limit)maxOverspeed=Math.max(maxOverspeed,state.speed-limit);
 }
 assert.equal(pilot.index,18);assert.equal(arrivals.length,18);assert.ok(maxArrivalSpeed<.2,`arrival ${maxArrivalSpeed}`);assert.ok(maxOverspeed<.15,`overspeed ${maxOverspeed}`);

});
test('autopilot cuts throttle in neutral section',()=>{const route={stations:[{name:'End',position:1000}],powerAt:()=>false};assert.equal(new Autopilot(route,initialState()).update({...initialState(),speed:5}).throttle,0);});

test('transport autopilot dwells on simulation time and manual takeover clears stop target',async()=>{
 const {Transport}=await import('../src/audio/scheduler.js');let clock=0;
 const route=new RouteIndex({length:100,stations:[{name:'A',position:5},{name:'B',position:100}]});
 const t=new Transport({clock:()=>clock,sink:{hit(){},silence(){},cancelFrom(){}},route,axles:[]});t.setAutopilot(true);t.start();
 for(let i=0;i<5000&&t.autopilot.arrivedAt===null;i++){clock+=.025;t.tick();}
 assert.notEqual(t.autopilot.arrivedAt,null);t.pause();const time=t.snapshot().time;clock+=120;t.start();assert.ok(t.snapshot().time-time<1);assert.equal(t.autopilot.index,0);
 t.setAutopilot(false);assert.equal(t.autopilot,null);assert.equal(t.controls.stopPosition,undefined);
});

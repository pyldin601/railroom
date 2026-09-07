import test from 'node:test';import assert from 'node:assert/strict';import {impactDistance} from '../src/audio/impact-distance.js';
test('impact attenuation includes wheel distance and carriage separation',()=>{
 const near=impactDistance({car:5,offset:110},117,5,'left');
 const farWheel=impactDistance({car:5,offset:125},117,5,'left');
 const farCar=impactDistance({car:9,offset:220},117,5,'left');
 assert.ok(near.direct>farWheel.direct);assert.ok(farCar.direct>0&&farCar.direct<near.direct);
 assert.ok(farCar.metal/near.metal>farCar.direct/near.direct,'structure layer retains more distant energy');
});
test('both layers respond to a changed seat position',()=>{
 const axle={car:5,offset:110};const near=impactDistance(axle,110,5,'left'),far=impactDistance(axle,125,5,'left');assert.ok(near.direct>far.direct&&near.metal>far.metal);
});
test('changing a carriage label cannot change the gain at the same wheel distance',()=>{
 const first=impactDistance({car:4,offset:100},117,5,'left');
 const second=impactDistance({car:3,offset:100},117,5,'left');
 assert.deepEqual(first,second);
});
test('near and far ends of the adjacent carriage have distinct distance gains',()=>{
 const seat=117.484;
 const near=impactDistance({car:4,offset:101.488},seat,5,'left');
 const far=impactDistance({car:4,offset:80.088},seat,5,'left');
 assert.ok(near.direct/far.direct>3,'direct impact changes clearly across the carriage');
 assert.ok(near.metal/far.metal>1.5,'metal also varies with wheel distance');
 assert.ok(near.metal/far.metal<near.direct/far.direct,'metal keeps its longer reach');
});
test('every wheel in the occupied carriage is louder than external wheels at all seat presets',()=>{
 for(const localSeat of [2,10.7,19.4]){
  const seat=4*26.696+localSeat,inside=[],outside=[];
  for(let car=1;car<=10;car++)for(const offset of [0,2.4,19,21.4]){
   const gain=impactDistance({car,offset:(car-1)*26.696+offset},seat,5,'left');
   (car===5?inside:outside).push(gain);
  }
  for(const layer of ['direct','metal'])assert.ok(Math.min(...inside.map(g=>g[layer]))>Math.max(...outside.map(g=>g[layer])),`${layer} at seat ${localSeat}`);
 }
});

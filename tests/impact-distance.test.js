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

import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {RouteIndex} from '../src/route/route-index.js';
const route=JSON.parse(fs.readFileSync(new URL('../public/route.json',import.meta.url)));
test('operating markers are unique, sorted and explicitly estimated',()=>{
 const markers=route.operatingMarkers;assert.equal(markers.length,9);assert.equal(new Set(markers.map(m=>m.id)).size,9);
 markers.forEach((m,i)=>{assert.match(m.id,/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.ok(Number.isFinite(m.position)&&m.position>=0&&m.position<route.length);assert.equal(m.status,'estimated');if(i)assert.ok(m.position>=markers[i-1].position);});
});
test('every construction zone has the requested scenario speed coverage',()=>{
 for(const section of route.sections){const m=route.operatingMarkers.find(m=>m.sectionId===section.id);assert.equal(m.position,section.position);assert.equal(m.endPosition,section.position+section.length);assert.equal(m.verifiedSpeedKmh,null);assert.ok(section.construction==='welded'?m.speedKmh===120:m.speedKmh<=40);}
});
test('Boiarka electrical markers are paired and never enter the impact scheduler',()=>{
 const pair=route.operatingMarkers.filter(m=>m.groupId==='boiarka-neutral-section');assert.deepEqual(pair.map(m=>m.type),['power_off','power_on']);assert.ok(pair[0].position<pair[1].position);
 const index=new RouteIndex(route);assert.equal(index.events.length,5118);assert.ok(index.events.every(e=>['joint','weld'].includes(e.type)));assert.equal(route.operatingMetadata.speedLimitsEnforced,false);
});

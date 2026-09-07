import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RouteIndex} from '../src/route/route-index.js';
const data=JSON.parse(readFileSync(new URL('../public/route.json',import.meta.url)));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
test('mixed route has continuous rail coverage with 25 m rails and welded strings up to 800 m',()=>{
 assert.ok(data.rails?.length,'explicit rail spans required');
 for(const side of ['left','right']){
  const rails=data.rails.filter(r=>r.side===side);let end=0;
  for(const r of rails){assert.equal(r.position,end);assert.ok(uuid.test(r.id));assert.ok(r.length>0&&r.length<=800);assert.equal(r.length%25,0);if(r.construction==='jointed')assert.equal(r.length,25);end+=r.length;}
  assert.equal(end,64000);assert.ok(rails.some(r=>r.length===800));assert.ok(rails.some(r=>r.length===25));
 }
});
test('every rail boundary is a joint and every internal fabrication seam is a weld',()=>{
 assert.ok(data.rails?.length);
 for(const side of ['left','right']){
  const rails=data.rails.filter(r=>r.side===side);const boundaries=new Set(rails.slice(1).map(r=>r.position));
  const events=data.events.filter(e=>e.side===side);assert.equal(events.length,2559);
  for(const e of events){assert.equal(e.type,boundaries.has(e.position)?'joint':'weld');assert.ok(uuid.test(e.id));}
 }
 assert.doesNotThrow(()=>new RouteIndex(data));
 assert.equal(new Set([...data.rails,...data.events,...data.stations,...data.sections].map(o=>o.id)).size,data.rails.length+data.events.length+data.stations.length+data.sections.length);
});
test('jointed station approaches and long welded stretches follow an explicit plan',()=>{
 assert.ok(data.sections?.length);let end=0;
 for(const s of data.sections){assert.equal(s.position,end);assert.ok(s.reason);end+=s.length;}assert.equal(end,64000);
 const at=p=>data.sections.find(s=>p>=s.position&&p<s.position+s.length).construction;
 for(const p of [0,7000,35000,63999])assert.equal(at(p),'jointed');
 for(const p of [3500,12000,23000,47000])assert.equal(at(p),'welded');
 assert.equal(data.stations.length,19);assert.equal(data.synthetic,true);
});
test('welded sections have direct string joints without short adjustment clusters',()=>{
 for(const section of data.sections.filter(s=>s.construction==='welded')){
  const spans=data.rails.filter(r=>r.sectionId===section.id&&r.side==='left');
  assert.ok(spans.every(r=>r.construction==='welded'&&r.length>=750));
  for(const side of ['left','right']){
   const joints=data.events.filter(e=>e.side===side&&e.type==='joint'&&e.position>section.position&&e.position<section.position+section.length);
   assert.deepEqual(joints.map(e=>e.position),spans.slice(1).map(r=>r.position));
  }
 }
});

test('all nineteen passenger stopping points are present in route order',()=>{
 assert.deepEqual(data.stations.map(s=>s.name),['Kyiv-Pasazhyrskyi','Karavaievi Dachi','Kyiv-Volynskyi','Vyshneve','Tarasivka','Boiarka','Maliutynka','Shliakhova','Hlevakha','Danylivka (888 km)','Vasylkiv I','Korchi','Motovylivka','Bilky','Pivni','Vyshniaky','Sorochyi Brid','Snitynka','Fastiv I']);
 data.stations.forEach((s,i)=>{assert.ok(uuid.test(s.id));assert.equal(s.positionStatus,'estimated');if(i)assert.ok(s.position>data.stations[i-1].position);});
});

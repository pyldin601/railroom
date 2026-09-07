import test from 'node:test';
import assert from 'node:assert/strict';
import {wheelAt} from '../src/ui/track-view.js';
import {wheelsets} from '../src/route/route-index.js';
import {COACH} from '../src/route/coach-geometry.js';
test('wheel clicks select the nearest axle and correct rail at different canvas sizes',()=>{
 for(const width of [350,800]){
  const axles=wheelsets(10),height=210,scale=(width-48)/(10*COACH.pitch+8);
  for(const axle of axles)for(const side of ['left','right']){
   const hit=wheelAt(width,height,axles,29+(axle.offset+5)*scale,height*.52+(side==='left'?-25:25));
   assert.equal(hit.axle.id,axle.id);assert.equal(hit.side,side);
  }
  assert.equal(wheelAt(width,height,axles,width/2,20),null);
 }
});

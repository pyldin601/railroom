import test from 'node:test';
import assert from 'node:assert/strict';
import { createStateStore, STORAGE_KEY } from '../src/state-store.js';
function storage() {
  const entries = new Map();
  return { getItem: k => entries.get(k) ?? null, setItem: (k,v) => entries.set(k,v) };
}
test('state store round-trips route, controls and mixer preferences without transient playback', () => {
  const disk = storage();
  const store = createStateStore(() => disk);
  store.save({ routeMode:'kyiv-lisbon', position:2605000, controls:{throttle:.6,brake:.2},
    audio:{master:.7,levels:{impact:.3,rolling:.4}}, running:true, autopilot:true });
  const restored = createStateStore(() => disk).load();
  assert.equal(restored.routeMode,'kyiv-lisbon');
  assert.equal(restored.position,2605000);
  assert.equal(restored.controls.throttle,.6);
  assert.equal(restored.controls.brake,.2);
  assert.equal(restored.audio.master,.7);
  assert.equal(restored.audio.levels.impact,.3);
  assert.equal(restored.audio.levels.rolling,.4);
  assert.equal(restored.running,undefined);
  assert.equal(restored.autopilot,undefined);
});
test('invalid saved state cannot inject routes or out-of-range controls', () => {
  const disk=storage(); const store=createStateStore(() => disk);
  disk.setItem(STORAGE_KEY,'not json'); assert.equal(store.load(),null);
  disk.setItem(STORAGE_KEY,JSON.stringify({version:999})); assert.equal(store.load(),null);
  disk.setItem(STORAGE_KEY,JSON.stringify({version:1,routeMode:'bad',position:900, controls:{throttle:9,brake:-2},audio:{levels:{impact:'bad'},yaw:999}}));
  const result=store.load();
  assert.equal(result.routeMode,'route'); assert.equal(result.position,0);
  assert.equal(result.controls.throttle,1); assert.equal(result.controls.brake,0);
  assert.equal(result.audio.levels.impact,1); assert.equal(result.audio.yaw,180);
});
test('unavailable or full storage is harmless and unchanged state avoids repeated writes', () => {
  const denied=createStateStore(() => {throw Error('denied');});
  assert.equal(denied.load(),null); assert.equal(denied.save({}),false);
  const disk=storage(); let writes=0;
  const store=createStateStore(() => ({...disk,setItem(k,v){writes++;disk.setItem(k,v);}}));
  store.save({position:5}); store.save({position:5}); assert.equal(writes,1);
  const full=createStateStore(() => ({...disk,setItem(){throw Error('quota');}}));
  assert.equal(full.save({}),false);
});

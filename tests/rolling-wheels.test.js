import test from 'node:test';import assert from 'node:assert/strict';
import {rollingWheels} from '../src/audio/rolling.js';
import {wheelsets} from '../src/route/route-index.js';
test('rolling uses eight distinct wheel feeds only in the occupied carriage',()=>{
 const feeds=rollingWheels(wheelsets(10),5);assert.equal(feeds.length,8);
 assert.ok(feeds.every(f=>f.axle.car===5));assert.equal(new Set(feeds.map(f=>`${f.axle.id}:${f.side}`)).size,8);
 assert.equal(new Set(feeds.map(f=>f.offset)).size,8);assert.equal(new Set(feeds.map(f=>f.rate)).size,8);
 assert.ok(feeds.every(f=>Math.abs(f.rate-1)<.003));
 assert.equal(rollingWheels(wheelsets(1),1).length,8);
});

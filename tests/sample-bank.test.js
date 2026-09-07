import test from 'node:test';import assert from 'node:assert/strict';
import {validateManifest,chooseSample} from '../src/audio/sample-bank.js';
test('missing recorded impacts cannot silently become synthesized sound',()=>assert.throws(()=>validateManifest({samples:[]})));
test('sample selection is repeatable and avoids consecutive identical variants',()=>{const pool=[{id:'a'},{id:'b'},{id:'c'}];const a=chooseSample(pool,'joint-1','a');assert.notEqual(a.id,'a');assert.equal(a.id,chooseSample(pool,'joint-1','a').id);});
test('manifest rejects missing provenance',()=>assert.throws(()=>validateManifest({samples:[{id:'a',kind:'joint',url:'a.wav'}]})));

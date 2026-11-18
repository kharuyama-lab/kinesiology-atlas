import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ankleRanges} from '../src/ankle-motion.js';

test('shipped ankle motion data matches its source, checksum and complete motion ranges',()=>{
 const meta=JSON.parse(fs.readFileSync('assets/ankle-motion/cache.json'));
 assert.equal(meta.localClearance,true);
 for(const entry of meta.entries)if(entry.contacts){for(const i of entry.contacts.vertices)assert.ok(Number.isInteger(i)&&i>=0&&i<entry.length/3);for(const i of entry.contacts.faces)assert.ok(Number.isInteger(i)&&i>=0);}
 for(const [path,hash] of Object.entries(meta.inputs))assert.equal(createHash('sha256').update(fs.readFileSync(path,'utf8').replace(/\r\n/g,'\n')).digest('hex'),meta.compatibleInputs?.[path]?.hash||hash,`Rebuild ankle motion data after changing ${path}`);
 const compressed=fs.readFileSync('assets/ankle-motion/positions.bin.gz');assert.equal(createHash('sha256').update(compressed).digest('hex'),meta.contentHash);
 const normal=fs.readFileSync('assets/ankle-motion/normals.bin.gz');assert.equal(createHash('sha256').update(normal).digest('hex'),meta.normalHash);assert.equal(gunzipSync(normal).length,meta.normalBytes);assert.equal(meta.normalBytes,meta.stride*meta.samples);
 const packed=gunzipSync(compressed);assert.equal(packed.length,meta.bytes);
 assert.equal(meta.stride,meta.entries.reduce((n,e)=>n+e.length,0));
 assert.equal(packed.length,meta.stride*4+meta.stride*meta.samples*2);
 let samples=0;for(const [kind,[min,max]] of Object.entries(ankleRanges)){const range=meta.motions[kind];assert.equal(range.min,min);assert.equal(range.max,max);assert.equal(range.offset,samples);assert.equal(range.count,(max-min)/range.step+1);samples+=range.count;}assert.equal(samples,meta.samples);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {muscleColors} from '../src/palette.js';
import {tissues} from '../src/anatomy.js';
test('preserve Hip muscle identity colors and cover all knee muscles',()=>{
 const legacy=readFileSync('legacy/hip/index.html','utf8');
 for(const [name,,kind] of tissues){if(kind!=='muscle')continue;assert.ok(Number.isInteger(muscleColors[name]),name);
  const key=[...legacy.matchAll(/(\w+):\['([^']+)'\]/g)].find(m=>m[2]===name)?.[1];
  if(key){const color=legacy.match(new RegExp('(?:[,\\s{])'+key+':0x([a-f0-9]+)'));assert.equal(muscleColors[name],parseInt(color[1],16),name);}
 }
 assert.equal(new Set(Object.values(muscleColors)).size,28);
});

import fs from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {BufferGeometry,BufferAttribute,Box3} from 'three';
import {chromium,expect} from '@playwright/test';
const root='assets/ankle-motion/',meta=JSON.parse(fs.readFileSync(root+'cache.json'));
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});let indices;
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});indices=await page.evaluate(()=>atlasAnkleCacheLayout());}finally{await browser.close();}
const packed=gunzipSync(fs.readFileSync(root+'positions.bin.gz')),base=new Float32Array(packed.buffer,packed.byteOffset,meta.stride),positions=new Int16Array(packed.buffer,packed.byteOffset+meta.stride*4);for(let i=meta.stride;i<positions.length;i++)positions[i]+=positions[i-meta.stride];
const geometries=meta.entries.map((e,i)=>new BufferGeometry().setAttribute('position',new BufferAttribute(new Float32Array(e.length),3)).setIndex(indices[i])),bounds=meta.entries.map(()=>new Box3()),normals=new Int8Array(meta.stride*meta.samples);
for(let sample=0;sample<meta.samples;sample++){let offset=0;for(let k=0;k<geometries.length;k++){
 const g=geometries[k],a=g.attributes.position;for(let i=0;i<a.array.length;i++)a.array[i]=base[offset+i]+positions[sample*meta.stride+offset+i]*meta.quantum;g.computeVertexNormals();g.computeBoundingBox();bounds[k].union(g.boundingBox);const n=g.attributes.normal.array;for(let i=0;i<n.length;i++)normals[sample*meta.stride+offset+i]=Math.round(Math.max(-1,Math.min(1,n[i]))*127);offset+=a.array.length;
}}
for(let i=normals.length-1;i>=meta.stride;i--)normals[i]-=normals[i-meta.stride];const compressed=gzipSync(Buffer.from(normals.buffer),{level:9});fs.writeFileSync(root+'normals.bin.gz',compressed);
meta.normalHash=createHash('sha256').update(compressed).digest('hex');meta.normalBytes=normals.length;meta.entries.forEach((entry,i)=>entry.bounds={min:bounds[i].min.toArray(),max:bounds[i].max.toArray()});fs.writeFileSync(root+'cache.json',JSON.stringify(meta,null,2)+'\n');console.log('Normal cache',compressed.length,'bytes');

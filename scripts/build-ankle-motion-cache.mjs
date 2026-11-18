import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ankleRanges} from '../src/ankle-motion.js';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});page.on('pageerror',e=>console.error(e));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa&ankle-solve');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 const chunks=[],motions={};let entries,samples=0;
 for(const [kind,[min,max]] of Object.entries(ankleRanges)){
  const step=.5,count=Math.round((max-min)/step)+1;motions[kind]={min,max,step,count,offset:samples};
  for(let i=0;i<count;i++){
   const value=min+i*step,data=await page.evaluate(([k,v])=>atlasBakeAnkle(k,v),[kind,value]);entries=data.entries;chunks.push(Buffer.from(new Float32Array(data.positions).buffer));samples++;
   if(i%20===0)console.log(kind,value,samples);
  }
 }
 const contacts=await page.evaluate(()=>atlasBakeAnkleContacts());entries=entries.map((e,i)=>({...e,contacts:contacts[i]}));
 const neutral=chunks[motions.flex.offset-motions.flex.min/motions.flex.step];for(const range of Object.values(motions))chunks[range.offset-range.min/range.step]=neutral;
 const inputs=['src/ankle-motion.js','src/ankle-ligament-follow.js','src/ankle-muscle-follow.js','src/ankle-retinaculum-follow.js','src/ankle-muscle-contact.js','src/ankle-muscle-excursion.js','src/ankle-achilles.js','src/ankle-tissue-sheet.js','config/ankle.json','config/ankle-supplements.js','config/ankle-tissue-layers.js','config/ankle-retinacula.js','src/ankle-layer-clearance.js','src/bone-surface.js','src/ankle-ligament-smoothing.js','config/ankle-ligaments.js','config/ankle-muscles.js','config/model-assets.js'];
 const hashes=Object.fromEntries(inputs.map(p=>[p,createHash('sha256').update(fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n')).digest('hex')]));
 const stride=entries.reduce((n,e)=>n+e.length,0),raw=Buffer.concat(chunks),data=new Float32Array(raw.buffer,raw.byteOffset,raw.byteLength/4),base=new Float32Array(neutral.buffer,neutral.byteOffset,stride).slice();let maximum=0;for(let i=0;i<data.length;i++)maximum=Math.max(maximum,Math.abs(data[i]-base[i%stride]));const quantum=Math.max(.000002,Math.ceil(maximum/32760*1e6)/1e6),q=new Int16Array(data.length);for(let i=0;i<data.length;i++)q[i]=Math.round((data[i]-base[i%stride])/quantum);for(let i=q.length-1;i>=stride;i--)q[i]-=q[i-stride];const packed=Buffer.concat([Buffer.from(base.buffer),Buffer.from(q.buffer)]);
 fs.mkdirSync('assets/ankle-motion',{recursive:true});const compressed=gzipSync(packed,{level:9}),contentHash=createHash('sha256').update(compressed).digest('hex');fs.writeFileSync('assets/ankle-motion/positions.bin.gz',compressed);fs.writeFileSync('assets/ankle-motion/cache.json',JSON.stringify({version:1,inputHashNormalization:'LF',localClearance:true,contentHash,encoding:'float32-neutral-int16-temporal-delta',quantum,stride,bytes:packed.length,stepDegrees:.5,samples,motions,entries,inputs:hashes},null,2)+'\n');console.log('Saved',samples,'samples;',fs.statSync('assets/ankle-motion/positions.bin.gz').size,'compressed bytes');await import('./build-ankle-cache-normals.mjs');
}finally{await browser.close();}

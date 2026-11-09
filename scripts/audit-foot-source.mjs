import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/ankle-source-review.html');await expect(page.locator('#status')).toContainText('Ready',{timeout:120000});
 const inventory=await page.evaluate(()=>sourceReview.inventory);fs.mkdirSync('docs/screenshots/ankle-source',{recursive:true});
 for(const view of ['lateral','medial','posterior']){await page.evaluate(v=>sourceReview.view(v),view);await page.waitForTimeout(100);await page.screenshot({path:'docs/screenshots/ankle-source/'+view+'.png'});}
 for(const name of ['Lateral talocalcaneal ligament.r','Anterior tibiofibular ligament.r','Posterior talocalcaneal ligament.r']){await page.evaluate(n=>{sourceReview.show(n);sourceReview.view('lateral');},name);await page.waitForTimeout(100);await page.screenshot({path:'docs/screenshots/ankle-source/'+name.replaceAll(' ','-')+'.png'});}
 if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync('docs/FOOT_SOURCE_INVENTORY.json',JSON.stringify({date:'2026-11-09 Asia/Tokyo',method:'Original pinned GLBs decoded by GLTFLoader; right-side spatial inventory maxY<0.16m; raw mesh PCA extreme 12% nearest-bone distances are geometric candidates, NOT attachment identification',inventory},null,2)+'\n');
 console.log(JSON.stringify(inventory.joints.filter(r=>r.foot).map(r=>({name:r.name,parent:r.parent,meshes:r.meshCount,active:r.activeFollower,ends:r.endCandidates})),null,2));
}finally{await browser.close();}

import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/ankle-source-review.html?supplements');await expect(page.locator('#status')).toContainText('Ready',{timeout:120000});
 const entries=await page.evaluate(()=>sourceReview.supplements());expect(entries).toHaveLength(3);
 for(const e of entries){expect(e.routeValid).toBe(true);expect(e.maxFootprintGap).toBeLessThan(1e-7);expect(e.maxBodyPenetration).toBeLessThan(.00005);expect(e.maxFacePenetration).toBeLessThan(.00005);expect(e.span).toBeGreaterThan(.008);expect(e.span).toBeLessThan(.06);expect(e.bones[0]).toBe('Fibula.r');}
 fs.mkdirSync('docs/screenshots/ankle-supplements',{recursive:true});
 for(const view of ['lateral','posterior']){await page.evaluate(v=>sourceReview.view(v),view);await page.waitForTimeout(100);await page.screenshot({path:'docs/screenshots/ankle-supplements/'+view+'.png'});}
 for(const e of entries){await page.evaluate(n=>{sourceReview.show(n);sourceReview.view('lateral');},e.name);await expect(page.locator('#label')).toContainText(e.jp);await page.screenshot({path:'docs/screenshots/ankle-supplements/'+e.id+'.png'});}
 await page.locator('#cervicalCompare').click();await expect(page.locator('#label')).toContainText('頸靭帯との対応候補');await page.locator('#boneReview').click();await expect(page.locator('#boneReview')).toHaveText('骨：ON');await page.screenshot({path:'docs/screenshots/ankle-supplements/cervical-comparison.png'});expect(errors).toEqual([]);fs.writeFileSync('docs/ANKLE_SUPPLEMENTS_VERIFICATION.json',JSON.stringify({date:'2026-11-09 Asia/Tokyo',stage:'static review only; user anatomical review pending',entries,errors},null,2)+'\n');console.log(JSON.stringify(entries,null,2));
}finally{await browser.close();}

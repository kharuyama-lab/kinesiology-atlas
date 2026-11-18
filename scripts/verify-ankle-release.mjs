import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const published=process.argv.includes('--published'),base=published?'https://kharuyama-lab.github.io/kinesiology-atlas/':'http://127.0.0.1:8081/kinesiology-atlas/',version=JSON.parse(fs.readFileSync('package.json')).version;
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(/ankle-motion\/.*\.gz/.test(r.url()))assets.push({url:r.url(),status:r.status(),encoding:r.headers()['content-encoding']||'none'});});
 await page.goto(base+'?qa',{waitUntil:'domcontentloaded'});await expect(page.locator('meta[name="application-version"]')).toHaveAttribute('content',version,{timeout:30000});await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow, noarchive');await expect(page.locator('[data-focus]')).toHaveCount(4);
 const home=await page.evaluate(()=>({focus:atlasQA().focus,mode:atlasQA().mode}));expect(home).toEqual({focus:'body',mode:'anatomy'});
 const samples=[];
 for(const [focus,value] of [['hip',30],['knee',60],['ankle',10]]){
  await page.locator(`[data-focus="${focus}"]`).click();await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});await page.locator('[data-mode="kinesiology"]').click();await page.locator('[data-motion="flex"]').click();await page.locator('#motionSlider').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await expect.poll(()=>page.evaluate(([focus,value])=>{const q=atlasQA();return focus==='ankle'?Math.abs(q.ankle.value-value):focus==='knee'?Math.abs(q.renderedAngles.flex-value):Math.abs(q.hip[0]);},[focus,value]),{timeout:60000})[focus==='hip'?'toBeGreaterThan':'toBeLessThan'](focus==='hip'?.1:.001);
  samples.push(await page.evaluate(()=>({focus:atlasQA().focus,mode:atlasQA().mode,motion:atlasQA().motion,value:atlasQA().motionValue})));
 }
 for(const [kind,value] of [['invert',10],['adduct',10],['compound',10]]){await page.locator(`[data-motion="${kind}"]`).click();await page.locator('#motionSlider').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value),{timeout:60000}).toBeLessThan(.001);samples.push({focus:'ankle',kind,value});}
 await expect(page.locator('#retinaculumVisibility')).toHaveAttribute('data-state','fade');await expect(page.locator('#muscleList')).toBeHidden();for(const button of await page.locator('#muscleGroups button').all())await expect(button).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>Number.isFinite(atlasAnklePerformanceQA().workerMs)),{timeout:30000}).toBe(true);expect(await page.evaluate(()=>atlasAnklePerformanceQA().workerError)).toBeUndefined();expect(assets).toHaveLength(2);for(const asset of assets)expect(asset.status).toBe(200);
 const popup=page.waitForEvent('popup');await page.locator('.creditsLink').click();const credits=await popup;await credits.waitForLoadState();await expect(credits.locator('h1')).toHaveText('Credits & use');await expect(credits.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow, noarchive');await credits.close();
 await page.locator('#resetPose').click();await expect.poll(()=>page.evaluate(()=>atlasAnkleStateQA().value),{timeout:60000}).toBe(0);await expect.poll(()=>page.evaluate(()=>atlasAnkleStateQA().retinaculumSettling||atlasAnkleStateQA().ligamentSettling),{timeout:60000}).toBe(false);
 const screenshot=`docs/screenshots/release/${published?'published':'staged'}-ankle-v0.3.png`;await page.screenshot({path:screenshot});expect(errors).toEqual([]);
 const report={url:base,version,verifiedAt:new Date().toISOString(),status:'passed',home,samples,assets,errors,screenshot};fs.writeFileSync(`docs/${published?'PUBLISHED':'STAGED'}_ANKLE_V0.3_VERIFICATION.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}

import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import {ankleMuscles} from '../config/ankle-muscles.js';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 const qa=()=>page.evaluate(()=>atlasAnkleMuscleQA());
 const initial=await qa();console.log('muscles',new Set(initial.entries.map(e=>e.name)).size);
 expect(new Set(initial.entries.map(e=>e.name)).size).toBe(ankleMuscles.length);
 expect(initial.finite).toBe(true);expect(initial.restError).toBeLessThan(.000001);
 const report=[];fs.mkdirSync('docs/screenshots/ankle-muscles',{recursive:true});
 await page.locator('#muscleDetails').evaluate(el=>el.open=true);
 await expect(page.locator('#muscleList')).toBeVisible();await expect(page.locator('#muscleList [data-tissue]:visible')).toHaveCount(15);
 await expect(page.locator('#muscleGroups button')).toHaveCount(4);
 await page.screenshot({path:'docs/screenshots/ankle-muscles/neutral.png'});
 for(const [motion,min,max] of [['flex',-40,20],['invert',-10,20],['adduct',-10,15],['compound',-15,20]]){
  await page.locator(`[data-motion="${motion}"]`).click();
  for(const value of [min,max,0]){
   await page.locator('#motionSlider').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value),{timeout:60000}).toBeLessThan(.0001);
   const result=await qa();expect(result.finite).toBe(true);expect(result.terminalError).toBeLessThan(.000001);
   if(value===0)expect(result.restError).toBeLessThan(.000001);else expect(Math.max(...result.entries.map(e=>e.maxDisplacement))).toBeGreaterThan(.001);
   report.push({motion,value,...result});console.log(motion,value,'pins',result.terminalError,'update ms',result.updateMs);
   if(value!==0)await page.screenshot({path:`docs/screenshots/ankle-muscles/${motion}-${value<0?'negative':'positive'}.png`});
  }
 }
 const visibility=()=>page.evaluate(()=>atlasQA().tissueMeshes.filter(e=>atlasAnkleMuscleQA().entries.some(m=>m.name===e.name)));
 for(const state of ['fade','off','on']){
  await page.locator(`[data-joint-bulk="muscle"][data-display-state="${state}"]`).click();
  for(const e of await visibility()){expect(e.visible).toBe(state!=='off');expect(e.opacity).toBeCloseTo(state==='fade'?.3:1);}
 }
 await page.locator('[data-muscle-group="inversion"]').click();expect((await visibility()).filter(e=>e.visible).map(e=>e.name).sort()).toEqual(['Tibialis anterior muscle.r','Tibialis posterior muscle.r'].sort());
 await page.locator('[data-joint-bulk="muscle"][data-display-state="on"]').click();
 await page.locator('[data-view="lateral"]').click();await page.screenshot({path:'docs/screenshots/ankle-muscles/lateral-neutral.png'});
 await page.locator('#motionSlider').evaluate(el=>{el.value=12;el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect.poll(()=>page.evaluate(()=>Math.abs(atlasAnkleStateQA().value-12)),{timeout:60000}).toBeLessThan(.0001);
 await page.locator('[data-mode="anatomy"]').click();await expect.poll(async()=>(await qa()).restError,{timeout:60000}).toBeLessThan(.000001);
 await page.locator('[data-mode="kinesiology"]').click();await expect.poll(()=>page.evaluate(()=>Math.abs(atlasAnkleStateQA().value-12)),{timeout:60000}).toBeLessThan(.0001);
 await page.screenshot({path:'docs/screenshots/ankle-muscles/lateral-supination.png'});
 await page.locator('[data-focus="knee"]').click();await expect(page.locator('#sectionTitle')).toContainText('Knee');
 await page.locator('[data-focus="hip"]').click();await expect(page.locator('#sectionTitle')).toContainText('Hip');
 expect(errors).toEqual([]);
 fs.writeFileSync('docs/ANKLE_MUSCLE_VERIFICATION.json',JSON.stringify({date:'2026-11-17 Asia/Tokyo',status:'passed',pageErrors:errors,samples:report,limitations:['source collars retain original bone offsets; not newly calibrated anatomical footprints','vertex routing is schematic; continuous tendon contact and physiological force are not validated']},null,2)+'\n');
}finally{await browser.close();}

import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 await page.locator('[data-view="lateral"]').click();
 await page.locator('[data-joint-bulk="muscle"][data-display-state="off"]').click();
 await page.locator('[data-joint-bulk="connective"][data-display-state="off"]').click();
 await page.locator('#muscleDetails').evaluate(el=>el.open=true);
 for(const name of ['Medial head of gastrocnemius.r','Lateral head of gastrocnemius.r','Soleus muscle.r','Calcaneal tendon.r'])await page.locator(`[data-tissue="${name}"]`).click();
 await page.mouse.move(1000,500);await page.mouse.wheel(0,650);await page.waitForTimeout(500);
 await page.mouse.move(1050,480);await page.mouse.down({button:'right'});await page.mouse.move(1050,650,{steps:10});await page.mouse.up({button:'right'});
 const slider=async value=>{await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value),{timeout:60000}).toBeLessThan(.000001);};
 const report=[];fs.mkdirSync('docs/screenshots/ankle-calf',{recursive:true});
 for(const angle of [-40,-20,0,10,20,0]){
  await slider(angle);const contact=await page.evaluate(()=>atlasAnkleCalfContactQA());
  console.log(angle,'max added cortical depth',Math.max(...contact.map(e=>e.maxAddedDepth)));
  for(const e of contact)expect(e.maxAddedDepth).toBeLessThan(.0001);
  report.push({angle,contact});
  await page.screenshot({path:`docs/screenshots/ankle-calf/flex-${angle}.png`});
 }
 expect(errors).toEqual([]);
 fs.writeFileSync('docs/ANKLE_CALF_VERIFICATION.json',JSON.stringify({date:'2026-11-17 Asia/Tokyo',status:'passed',method:'source-relative added depth at free periarticular vertices and triangle centroids; original terminal collar offsets retained',pageErrors:errors,samples:report},null,2)+'\n');
}finally{await browser.close();}

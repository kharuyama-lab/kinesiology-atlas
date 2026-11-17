import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const report=[];
 fs.mkdirSync('docs/screenshots/ankle-tendon-routes',{recursive:true});
 for(const [family,names] of [['calf',['Medial head of gastrocnemius.r','Lateral head of gastrocnemius.r','Soleus muscle.r','Calcaneal tendon.r']],['peroneal',['Fibularis longus muscle.r','Fibularis brevis muscle.r']]]){
  await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
  await page.locator('[data-view="lateral"]').click();await page.locator('[data-joint-bulk="muscle"][data-display-state="off"]').click();await page.locator('[data-joint-bulk="connective"][data-display-state="off"]').click();
  await page.locator('#muscleDetails').evaluate(el=>el.open=true);for(const name of names)await page.locator(`[data-tissue="${name}"]`).click();
  if(family==='calf'){await page.mouse.move(1000,500);await page.mouse.wheel(0,650);await page.waitForTimeout(400);await page.mouse.move(1050,480);await page.mouse.down({button:'right'});await page.mouse.move(1050,650,{steps:10});await page.mouse.up({button:'right'});}
  for(const value of [-40,-30,-20,-10,0,10,20,0]){
   await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value),{timeout:120000}).toBeLessThan(.000001);
   const contact=await page.evaluate(n=>atlasAnkleMuscleContactQA(n),names),tendon=await page.evaluate(()=>atlasAnkleAchillesQA()),geometry=await page.evaluate(()=>atlasAnkleMuscleQA());
   for(const c of contact)expect(c.maxAddedDepth,`${family} ${value} ${c.name}`).toBeLessThan(.00025);
   expect(Math.abs(tendon.length-tendon.restLength)).toBeLessThan(.0000001);
   console.log(family,value,'depth',Math.max(...contact.map(c=>c.maxAddedDepth)),'ms',geometry.updateMs);
   if(value===-40)console.log('contact profile',geometry.entries.filter(e=>e.contactMs>3).map(e=>({name:e.name,ms:e.contactMs,corrections:e.corrections})));
   report.push({family,value,contact,tendon,updateMs:geometry.updateMs});
   if([-40,0,20].includes(value))await page.screenshot({path:`docs/screenshots/ankle-tendon-routes/${family}-${value}.png`});
  }
 }
 expect(errors).toEqual([]);fs.writeFileSync('docs/ANKLE_TENDON_ROUTE_VERIFICATION.json',JSON.stringify({date:'2026-11-17 Asia/Tokyo',status:'passed',pageErrors:errors,samples:report},null,2)+'\n');
}finally{await browser.close();}

import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const probe=process.argv.includes('--probe'),browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 const initial=await page.evaluate(()=>({ret:atlasAnkleRetinaculumQA(),state:atlasQA().tissueMeshes,excursion:atlasAnkleExcursionQA()}));
 expect(initial.ret).toHaveLength(5);for(const e of initial.state.filter(e=>e.visible&&e.count>0))expect(e.opacity).toBeCloseTo(e.group==='muscle'?1:.3);
 await page.locator('[data-joint-bulk="muscle"][data-display-state="on"]').click();await page.locator('[data-joint-bulk="connective"][data-display-state="on"]').click();
 fs.mkdirSync('docs/screenshots/ankle-tissue-dynamics',{recursive:true});const report=[];
 for(const [motion,value] of [['flex',0],['flex',-40],['flex',-20],['flex',10],['flex',20],['flex',0],['invert',-10],['invert',20],['invert',0],['adduct',-10],['adduct',15],['adduct',0],['compound',-15],['compound',20],['compound',0]]){
  await page.locator(`[data-motion="${motion}"]`).click();await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
  await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value),{timeout:180000}).toBeLessThan(.00001);
  await expect.poll(()=>page.evaluate(()=>atlasAnkleStateQA().ligamentSettling),{timeout:180000}).toBe(false);
await expect.poll(()=>page.evaluate(()=>atlasAnkleStateQA().retinaculumSettling),{timeout:30000}).toBe(false);
  const data=await page.evaluate(()=>({layers:atlasAnkleLayerQA(),ligaments:atlasQA().ankleLigamentAudit,excursion:atlasAnkleExcursionQA(),contact:atlasAnkleMuscleContactQA(),muscles:atlasAnkleMuscleQA()}));report.push({motion,value,...data});
  console.log(motion,value,JSON.stringify({belly:data.excursion.filter(e=>/Tibialis anterior|Medial head of gastrocnemius/.test(e.name)).map(e=>({name:e.name,mm:e.excursion*1000})),layers:data.layers.muscles.filter(e=>e.maxDepth>.0003),ret:data.layers.retinacula.filter(e=>e.maxCoverError>.0005),bones:data.contact.filter(e=>e.maxAddedDepth>.0003).map(e=>({name:e.name,mm:e.maxAddedDepth*1000})),ms:data.muscles.updateMs}));
  if(!probe){for(const e of data.layers.muscles)expect(e.maxDepth,`${motion} ${value}: ${e.name}`).toBeLessThan(.0003);for(const e of data.contact)expect(e.maxAddedDepth).toBeLessThan(.0003);for(const e of data.layers.retinacula){expect(e.maxAnchorError).toBeLessThan(.000001);expect(e.maxCoverError).toBeLessThan(.0005);}for(const e of data.ligaments){expect(e.routeValid,`${motion} ${value} ${e.name}`).toBe(true);expect(e.maxPenetration,e.name).toBeLessThan(.0001);expect(e.maxFacePenetration,e.name).toBeLessThan(.0001);}}
  await page.screenshot({path:`docs/screenshots/ankle-tissue-dynamics/${motion}-${value}.png`});
 }
 await page.locator('[data-view="lateral"]').click();await page.mouse.move(1000,500);await page.mouse.wheel(0,650);await page.waitForTimeout(400);await page.mouse.move(1050,480);await page.mouse.down({button:'right'});await page.mouse.move(1050,650,{steps:10});await page.mouse.up({button:'right'});
 await page.locator('[data-motion="flex"]').click();for(const value of [-40,20]){await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value),{timeout:120000}).toBeLessThan(.00001);await page.screenshot({path:`docs/screenshots/ankle-tissue-dynamics/whole-belly-${value}.png`});}
 expect(errors).toEqual([]);fs.writeFileSync('docs/ANKLE_TISSUE_DYNAMICS_VERIFICATION.json',JSON.stringify({date:new Date().toLocaleString('sv-SE',{timeZone:'Asia/Tokyo'})+' Asia/Tokyo',status:probe?'probe':'passed',pageErrors:errors,initial,samples:report},null,2)+'\n');
}finally{await browser.close();}

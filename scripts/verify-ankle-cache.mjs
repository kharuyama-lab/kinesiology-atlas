import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 await expect(page.locator('#muscleList')).toBeHidden();for(const button of await page.locator('#muscleGroups button').all())await expect(button).toBeVisible();
 const state=await page.evaluate(()=>atlasQA().tissueMeshes);for(const e of state.filter(e=>e.visible&&e.count))expect(e.opacity).toBeCloseTo(e.group==='muscle'?1:.3);
 expect(await page.locator('.displayControls button').evaluateAll(els=>els.filter(e=>!e.hidden).map(e=>e.id))).toEqual(['boneVisibility','axisVisibility','retinaculumVisibility']);
 await page.locator('[data-joint-bulk="connective"][data-display-state="off"]').click();await expect(page.locator('#retinaculumVisibility')).toHaveAttribute('data-state','fade');
 await page.locator('#retinaculumVisibility').click();await expect(page.locator('#retinaculumVisibility')).toHaveAttribute('data-state','off');
 await page.locator('[data-joint-bulk="connective"][data-display-state="on"]').click();await expect(page.locator('#retinaculumVisibility')).toHaveAttribute('data-state','off');await page.locator('#retinaculumVisibility').click();
 await page.locator('#muscleDetailToggle').click();await expect(page.locator('#muscleList')).toBeVisible();await expect(page.locator('#muscleList [data-tissue]:visible')).toHaveCount(30);await page.locator('#muscleDetailToggle').click();
 const samples=[];
 for(const [kind,values] of [['flex',[-39.75,-20.25,-.25,.25,19.75]],['invert',[-9.75,-.25,.25,19.75]],['adduct',[-9.75,-.25,.25,14.75]],['compound',[-14.75,-.25,.25,19.75]]]){
  await page.locator(`[data-motion="${kind}"]`).click();
  for(const value of values){
   await page.locator('#motionSlider').evaluate((el,v)=>{el.step='.25';el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value)).toBeLessThan(.00001);
await expect.poll(()=>page.evaluate(()=>atlasAnkleStateQA().retinaculumSettling),{timeout:30000}).toBe(false);
   const data=await page.evaluate(()=>({layers:atlasAnkleLayerQA(),contact:atlasAnkleMuscleContactQA(),ligaments:atlasQA().ankleLigamentAudit}));
   const sample={kind,value,layer:Math.max(...data.layers.muscles.map(e=>e.maxDepth)),bone:Math.max(...data.contact.map(e=>e.maxAddedDepth)),ret:Math.max(...data.layers.retinacula.map(e=>e.maxCoverError)),ligament:Math.max(...data.ligaments.map(e=>Math.max(e.maxPenetration,e.maxFacePenetration))),anchor:Math.max(...data.ligaments.map(e=>e.maxAnchorError))};samples.push(sample);console.log(sample);if(sample.layer>.0003||sample.ligament>.0003)console.log(JSON.stringify({layers:data.layers.muscles.filter(e=>e.maxDepth>.0003),ligaments:data.ligaments.filter(e=>Math.max(e.maxPenetration,e.maxFacePenetration)>.0003)}));
   expect(sample.layer).toBeLessThan(.0003);expect(sample.bone).toBeLessThan(.0003);expect(sample.ret).toBeLessThan(.0005);expect(sample.ligament).toBeLessThan(.0003);expect(sample.anchor).toBeLessThan(.000001);
  }
 }
 await page.locator('#resetPose').click();await expect.poll(()=>page.evaluate(()=>atlasAnkleStateQA().value)).toBe(0);await page.locator('[data-joint-bulk="connective"][data-display-state="fade"]').click();await page.locator('#retinaculumVisibility').click();await expect.poll(()=>page.evaluate(()=>atlasAnkleStateQA().retinaculumSettling)).toBe(false);await page.screenshot({path:'docs/screenshots/ankle-ui-responsive.png'});expect(errors).toEqual([]);
 fs.writeFileSync('docs/ANKLE_CACHE_VERIFICATION.json',JSON.stringify({status:'passed',samples,errors},null,2)+'\n');
}finally{await browser.close();}

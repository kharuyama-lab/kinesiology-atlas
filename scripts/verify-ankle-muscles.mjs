import {chromium,expect} from '@playwright/test';
import fs from 'node:fs';
import {ankleMuscles,ankleStaticMuscles} from '../config/ankle-muscles.js';
import {Matrix4,Vector3} from 'three';
import {muscleGroups} from '../src/muscle-groups.js';
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?focus=ankle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:120000});
 const qa=()=>page.evaluate(()=>atlasAnkleMuscleQA());
 const initial=await qa();console.log('muscles',new Set(initial.entries.map(e=>e.name)).size);
 expect(new Set(initial.entries.map(e=>e.name)).size).toBe(ankleMuscles.length);
 expect(initial.finite).toBe(true);expect(initial.restError).toBeLessThan(.000001);
 const report=[];fs.mkdirSync('docs/screenshots/ankle-muscles',{recursive:true});
 const staticRest=await page.evaluate(()=>atlasAnkleStaticMuscleQA());expect(staticRest).toHaveLength(15);
 await page.locator('#muscleDetails').evaluate(el=>el.open=true);
 await expect(page.locator('#muscleList')).toBeVisible();await expect(page.locator('#muscleList [data-tissue]:visible')).toHaveCount(ankleMuscles.length+ankleStaticMuscles.length);
 await expect(page.locator('#muscleGroups button')).toHaveCount(4);
 await page.screenshot({path:'docs/screenshots/ankle-muscles/neutral.png'});
 for(const [motion,min,max] of [['flex',-40,20],['invert',-10,20],['adduct',-10,15],['compound',-15,20]]){
  await page.locator(`[data-motion="${motion}"]`).click();
  for(const value of [min,max,0]){
   await page.locator('#motionSlider').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},value);
   await expect.poll(()=>page.evaluate(v=>Math.abs(atlasAnkleStateQA().value-v),value),{timeout:60000}).toBeLessThan(.0001);
   const result=await qa();expect(result.finite).toBe(true);expect(result.terminalError).toBeLessThan(.000001);
   const statics=await page.evaluate(()=>atlasAnkleStaticMuscleQA());
   for(let i=0;i<statics.length;i++){
    const current=statics[i],rest=staticRest[i];expect(current.name).toBe(rest.name);
    expect(current.meshes.every(m=>m.visible)).toBe(true);
    expect(current.meshes.map(m=>m.positions.length)).toEqual(rest.meshes.map(m=>m.positions.length));
    for(let k=0;k<current.meshes.length;k++){
     expect(current.meshes[k].positions.every(Number.isFinite)).toBe(true);
     if(value===0)for(let v=0;v<current.meshes[k].positions.length;v++)expect(current.meshes[k].positions[v]).toBeCloseTo(rest.meshes[k].positions[v],6);
    }
    const expected=new Matrix4().fromArray(current.frame).multiply(new Matrix4().fromArray(rest.frame).invert()).multiply(new Matrix4().fromArray(rest.matrix));
    for(let j=0;j<16;j++)expect(current.matrix[j]).toBeCloseTo(expected.elements[j],6);
   }
   const tendon=await page.evaluate(()=>atlasAnkleAchillesQA()),parts=await page.evaluate(()=>atlasAnkleMuscleGeometryQA('Calcaneal tendon.r'));
   let maxFreeEdgeError=0,freeEdges=0;
   for(const part of parts)for(let i=0;i<part.indices.length;i+=3){const ids=part.indices.slice(i,i+3);for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3];if(part.rest[a][1]<=tendon.freeFromY||part.rest[b][1]<=tendon.freeFromY)continue;const before=new Vector3(...part.rest[a]).distanceTo(new Vector3(...part.rest[b])),after=new Vector3(...part.positions[a]).distanceTo(new Vector3(...part.positions[b]));maxFreeEdgeError=Math.max(maxFreeEdgeError,Math.abs(before-after));freeEdges++;}}
   expect(freeEdges).toBeGreaterThan(100);expect(maxFreeEdgeError).toBeLessThan(.0000001);expect(Math.abs(tendon.length-tendon.restLength)).toBeLessThan(.0000001);result.achilles={...tendon,maxFreeEdgeError,freeEdges};
   if(motion==='flex'&&value!==0){
    const calf=[];
    for(const name of ['Medial head of gastrocnemius.r','Lateral head of gastrocnemius.r','Soleus muscle.r','Calcaneal tendon.r']){
     const parts=await page.evaluate(n=>atlasAnkleMuscleGeometryQA(n),name);let upperBedError=0;
     for(const part of parts)for(let i=0;i<part.rest.length;i++)if(part.rest[i][1]>=.36)upperBedError=Math.max(upperBedError,new Vector3(...part.rest[i]).distanceTo(new Vector3(...part.positions[i])));
     expect(upperBedError).toBeLessThan(.000001);calf.push({name,upperBedError});
    }
    result.calf=calf;
    await page.waitForTimeout(300);const held=await qa();
    for(let i=0;i<result.entries.length;i++)expect(Math.abs(held.entries[i].maxDisplacement-result.entries[i].maxDisplacement)).toBeLessThan(.000001);
   }
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
 for(const [key,group] of Object.entries(muscleGroups.ankle)){
  await page.locator(`[data-muscle-group="${key}"]`).click();await expect(page.locator(`[data-muscle-group="${key}"]`)).toHaveText(group.label);
  expect((await visibility()).filter(e=>e.visible).map(e=>e.name).sort()).toEqual([...group.names].sort());
 }
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

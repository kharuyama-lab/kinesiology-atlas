import {test,expect} from '@playwright/test';
import {Vector3,Quaternion} from 'three';
import {writeFileSync} from 'node:fs';
test('meniscal bodies glide on tibia with roots retained; reverse, Auto and Anatomy restore correctly',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=knee&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const snap=()=>page.evaluate(()=>window.atlasQA()),meshes=()=>page.evaluate(()=>Object.fromEntries(['Medial meniscus.r','Lateral meniscus.r'].map(n=>[n,window.atlasMeshQA(n)[0].positions])));
 await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-focus="knee"]').click();
 await expect.poll(async()=>Math.max(...(await snap()).menisci.map(e=>Math.hypot(...e.displacement)))).toBeLessThan(1e-10);
 const rest=await meshes(),reports=[];
 await page.locator('[data-mode="kinesiology"]').click();
 for(const angle of [0,10,20,60,90,120,90,0]){
  await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));
  await page.locator('[data-focus="knee"]').click();
  await expect.poll(async()=>Math.abs((await snap()).renderedAngles.flex-angle)).toBeLessThan(.001);
  const s=await snap(),current=await meshes(),k=new Vector3(...s.calibration.kneeCenter),hip=new Vector3(...s.calibration.hipCenter),h=new Quaternion(...s.hip).invert(),q=new Quaternion(...s.knee).invert(),d=new Vector3(...s.kneeTranslation);
  for(const entry of s.menisci){
   const local=current[entry.name].map(v=>new Vector3(...v).sub(hip).applyQuaternion(h).add(hip).sub(k).sub(d).applyQuaternion(q));
   for(const root of entry.roots)expect(Math.min(...local.map(p=>p.distanceTo(new Vector3(...root))))).toBeLessThan(.000002);
   const deltas=local.map((p,i)=>p.clone().sub(new Vector3(...rest[entry.name][i]).sub(k)));
   expect(Math.max(...deltas.map(p=>Math.hypot(p.x,p.z)))).toBeLessThan(.013002);expect(deltas.every(p=>Number.isFinite(p.y))).toBeTruthy();
   expect(entry.contactResidual).toBeLessThan(.0005);
  }
  reports.push({angle,coupledAxial:s.coupledAxial,menisci:s.menisci});
  if(angle===90){await page.locator('[data-view="lateral"]').click();await page.locator('#viewport').screenshot({path:'test-results/menisci-90.png'});}
 }
 await page.locator('#playMotion').click();await expect.poll(async()=>Math.max(...(await snap()).menisci.map(e=>Math.abs(e.centroidDisplacement[2])))).toBeGreaterThan(.00002);await page.locator('#playMotion').click();
 await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-focus="knee"]').click();
 await expect.poll(async()=>{const actual=await meshes();return Math.max(...Object.entries(rest).flatMap(([name,points])=>points.map((v,i)=>new Vector3(...v).distanceTo(new Vector3(...actual[name][i])))));}).toBeLessThan(.000002);
 writeFileSync('test-results/menisci-review.json',JSON.stringify({status:'SCHEMATIC EXCURSION — ROOTS/CONTACT NOT VALIDATED',reports},null,2));
});

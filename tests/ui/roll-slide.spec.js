import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {kneePose} from '../../src/joint-motion.js';
import {Vector3} from 'three';
test('coupled translation reaches actual tibial meshes, preserves camera, reverses and restores Anatomy',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=knee&axis=condyle&qa');
 await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const snap=()=>page.evaluate(()=>window.atlasQA());
 const contactModel=await page.evaluate(()=>window.atlasContactQA());
 await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-focus="knee"]').click();
 const rest=await page.evaluate(()=>window.atlasMeshQA('Tibia.r')[0].positions.slice(0,3));
 await page.locator('[data-mode="kinesiology"]').click();
 const reports=[];
 for(const angle of [0,30,60,90,120,90,0]){
  await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));
  await expect.poll(async()=>{const state=await snap(),p=kneePose('flex',angle,state.calibration.sideSign,{flexAxis:state.activeFlexAxis,contactModel});return Math.hypot(...state.kneeTranslation.map((v,i)=>v-p.translation.toArray()[i]));}).toBeLessThan(.00001);
  const s=await snap();reports.push({angle,translation:s.kneeTranslation,instantaneous:s.instantaneous,extrapolated:s.extrapolated});
  expect(s.extrapolated).toBe(angle>120);
  const center=s.calibration.kneeCenter,hip=s.calibration.hipCenter;
  // Registered tibia geometry must receive the same complete transform as the solver.
  const p=kneePose('flex',angle,s.calibration.sideSign,{flexAxis:s.activeFlexAxis,contactModel});
  const expected=rest.map(v=>new Vector3(...v).sub(new Vector3(...center)).applyQuaternion(p.knee).add(new Vector3(...center)).add(p.translation).sub(new Vector3(...hip)).applyQuaternion(p.hip).add(new Vector3(...hip)));
  await expect.poll(async()=>{const actual=await page.evaluate(()=>window.atlasMeshQA('Tibia.r')[0].positions.slice(0,3));return Math.max(...actual.map((v,i)=>new Vector3(...v).distanceTo(expected[i])));}).toBeLessThan(.00002);
  expect(center).toHaveLength(3);expect(hip).toHaveLength(3);
 }
 const a=await snap();
 await page.locator('#motionSlider').evaluate(el=>{el.value='90';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await expect.poll(async()=>Math.hypot(...(await snap()).kneeTranslation)).toBeGreaterThan(.0001);
 const b=await snap();expect(Math.hypot(...a.camera.map((v,i)=>v-b.camera[i]))).toBeLessThan(.00001);expect(Math.hypot(...a.target.map((v,i)=>v-b.target[i]))).toBeLessThan(.00001);
 await page.locator('[data-mode="anatomy"]').click();await expect.poll(async()=>Math.hypot(...(await snap()).kneeTranslation)).toBeLessThan(.00001);
 await page.locator('[data-mode="kinesiology"]').click();await expect.poll(async()=>Math.hypot(...(await snap()).kneeTranslation)).toBeGreaterThan(.0001);
 expect((await snap()).motionValue).toBe(90);
 writeFileSync('test-results/roll-slide-review.json',JSON.stringify({status:'GENERIC REFERENCE — NOT ANATOMICAL APPROVAL',reports},null,2));
 await page.locator('[data-view="lateral"]').click();await page.locator('#viewport').screenshot({path:'test-results/roll-slide-90.png'});
});

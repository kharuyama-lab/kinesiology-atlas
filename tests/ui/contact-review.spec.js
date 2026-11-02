import {test,expect} from '@playwright/test';import {writeFileSync} from 'node:fs';
import {Vector3} from 'three';import {kneePose} from '../../src/joint-motion.js';import {meshVolumeProbe} from '../mesh-volume.mjs';
test('mesh contact review: paired surfaces, migrating axis and tibial menisci',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=knee&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');const reports=[];
 await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-focus="knee"]').click();
 const bind=await page.evaluate(()=>({mesh:window.atlasMeshQA('Femur.r')[0],model:window.atlasContactQA(),state:window.atlasQA()}));
 writeFileSync('.cache/contact-bind.json',JSON.stringify(bind));
 const probe=meshVolumeProbe(bind.mesh);
 let rejectedAxisCount=0;const axisChecks=[];for(let angle=0;angle<=120;angle++){
  const pose=kneePose('flex',angle,bind.state.calibration.sideSign,{flexAxis:bind.state.activeFlexAxis,contactModel:bind.model}),a=new Vector3(...bind.model.a),c=pose.instantaneous.point,d=pose.instantaneous.direction;
  for(const profile of bind.model.profiles){const p=c.clone().addScaledVector(d,(profile.x-c.dot(a))/d.dot(a)).add(new Vector3(...bind.state.calibration.kneeCenter));const result=probe(p);axisChecks.push({angle,compartment:profile.kind,...result,point:p.toArray()});expect(result.inside,`${angle}° ${profile.kind}: axis must intersect condylar bone volume`).toBeTruthy();}
  const old=kneePose('flex',angle,bind.state.calibration.sideSign,{flexAxis:bind.state.activeFlexAxis}),oldPoint=old.instantaneous.point,oldDirection=old.instantaneous.direction;
  for(const profile of bind.model.profiles){const p=oldPoint.clone().addScaledVector(oldDirection,(profile.x-oldPoint.dot(a))/oldDirection.dot(a)).add(new Vector3(...bind.state.calibration.kneeCenter));if(!probe(p).inside)rejectedAxisCount++;}
 }
 expect(rejectedAxisCount,'negative control must detect the rejected generic trajectory').toBeGreaterThan(0);
 await page.locator('[data-mode="kinesiology"]').click();
 for(const angle of [0,10,20,30,45,60,90,120]){
  await page.locator('#motionSlider').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));await page.locator('[data-focus="knee"]').click();await page.locator('[data-view="lateral"]').click();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));const s=await page.evaluate(()=>window.atlasQA());reports.push(s);
  expect(s.contacts).toHaveLength(2);expect(Math.max(...s.menisci.flatMap(e=>e.displacement.map(Math.abs)))).toBeLessThanOrEqual(.012001);
  await page.locator('#viewport').screenshot({path:`test-results/contact-lateral-${angle}.png`});
  if([30,60,90,120].includes(angle)){await page.locator('[data-view="medial"]').click();await page.locator('#viewport').screenshot({path:`test-results/contact-medial-${angle}.png`});await page.locator('[data-view="iso"]').click();await page.locator('#viewport').screenshot({path:`test-results/contact-3d-${angle}.png`});}
  if(angle===60){const box=await page.locator('#viewport').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);for(let i=0;i<12;i++)await page.mouse.wheel(0,-100);await page.locator('#viewport').screenshot({path:'test-results/contact-closeup-60.png'});}
 }
 writeFileSync('test-results/contact-review.json',JSON.stringify({status:'GEOMETRIC REVIEW — NOT APPROVED',rejectedAxisCount,axisChecks,reports},null,2));
});

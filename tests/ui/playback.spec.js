import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
import {Vector3} from 'three';
import {kneePose} from '../../src/joint-motion.js';
test('Auto reverses, pauses at current angle and retains state across modes; bone-only review',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const snap=()=>page.evaluate(()=>window.atlasQA());
 await page.locator('[data-focus="knee"]').click();
 const bind=await page.evaluate(()=>({surface:window.atlasSurfaceQA(),calibration:window.atlasQA().calibration,candidate:window.atlasQA().landmarkReview}));
 const centerTests=[['current',bind.calibration.kneeCenter],['mesh-end candidate (not applied)',bind.candidate.center]],audit=[];
 for(const [name,center] of centerTests){const pivot=new Vector3(...center);for(const angle of [0,30,60,90,120,140]){
  const pose=kneePose('flex',angle,bind.calibration.sideSign);let min2=Infinity;
  for(const tp of bind.surface.tibia){const t=new Vector3(...tp).sub(pivot).applyQuaternion(pose.knee).add(pivot).add(pose.translation);for(const fp of bind.surface.femur){const d=(t.x-fp[0])**2+(t.y-fp[1])**2+(t.z-fp[2])**2;min2=Math.min(min2,d);}}
  audit.push({pivot:name,flexionDeg:angle,nearestSampleDistance:Math.sqrt(min2)});
 }}
 writeFileSync('test-results/knee-surface-audit.json',JSON.stringify({status:'NOT ANATOMICAL VALIDATION',method:'closest vertex sample distance: distal femur / proximal tibia; unsigned, no contact/penetration determination',counts:{femur:bind.surface.femur.length,tibia:bind.surface.tibia.length},rows:audit},null,2));
 await page.locator('[data-tissue]').evaluateAll(rows=>{for(const row of rows)if(!row.hidden&&!row.disabled)while(row.dataset.state!=='off')row.click();});
 await page.locator('[data-mode="kinesiology"]').click();await page.locator('[data-view="lateral"]').click();
 await page.locator('[data-motion="stress"]').click();const slider=page.locator('#motionSlider');
 await slider.evaluate(el=>{el.value='2.9';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.locator('#playMotion').click();await expect(page.locator('#playMotion')).toHaveText('Pause');
 await expect.poll(async()=>(await snap()).playDirection).toBe(-1);
 await page.locator('#playMotion').click();const paused=await snap();
 await page.evaluate(()=>new Promise(resolve=>{let frames=0;function step(){if(++frames===8)resolve();else requestAnimationFrame(step);}requestAnimationFrame(step);}));
 await expect(page.locator('#playMotion')).toHaveText('Auto');await expect.poll(async()=>(await snap()).motionValue).toBe(paused.motionValue);
 await page.locator('#playMotion').click();await page.locator('[data-mode="anatomy"]').click();const anatomy=await snap();expect(anatomy.playing).toBeTruthy();
 await page.evaluate(()=>new Promise(resolve=>{let frames=0;function step(){if(++frames===8)resolve();else requestAnimationFrame(step);}requestAnimationFrame(step);}));
 await expect.poll(async()=>(await snap()).motionValue).toBe(anatomy.motionValue);
 await page.locator('[data-mode="kinesiology"]').click();await expect(page.locator('#playMotion')).toHaveText('Pause');await expect.poll(async()=>(await snap()).motionValue).not.toBe(anatomy.motionValue);
 await slider.evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});await expect(page.locator('#playMotion')).toHaveText('Auto');
 await page.locator('[data-motion="flex"]').click();await page.locator('#playMotion').click();await expect.poll(async()=>(await snap()).motionValue).not.toBe(90);
 await page.locator('#playMotion').click();await page.screenshot({path:'test-results/knee-auto-bones.png'});
 expect((await snap()).tissueMeshes.every(m=>!m.visible)).toBeTruthy();expect((await snap()).bones.every(m=>m.visible)).toBeTruthy();
 await page.locator('[data-focus="body"]').click();expect((await snap()).playing).toBeFalsy();
});
test('joint-review link starts Knee Mode 2 with skeleton, linked menisci and existing axis control',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=knee&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const state=await page.evaluate(()=>window.atlasQA());expect(state.mode).toBe('kinesiology');expect(state.focus).toBe('knee');expect(state.tissueMeshes.filter(m=>m.visible).map(m=>m.name).sort()).toEqual(['Lateral meniscus.r','Medial meniscus.r']);expect(state.bones.every(m=>m.visible)).toBeTruthy();
 await expect(page.locator('#muscleList')).toBeHidden();await expect(page.locator('#ligamentList')).toBeHidden();await expect(page.locator('#ligamentTendency')).toBeHidden();await expect(page.locator('#axisToggle')).not.toBeChecked();await page.locator('#axisVisibility').click();await expect(page.locator('#playMotion')).toHaveText('Auto');
 await expect(page.locator('.viewTools #playMotion')).toHaveCount(0);
 await expect(page.locator('.inlineActions #playMotion + #resetPose')).toHaveCount(1);
 expect(await page.evaluate(()=>window.atlasAxisQA())).toMatchObject({visible:true,names:['SI tibia','ML tibia','AP tibia','SI femur','ML femur']});
 await expect.poll(async()=>Math.abs((await page.evaluate(()=>window.atlasQA())).hip[0])).toBeGreaterThan(.706);
 const guides=await page.evaluate(()=>window.atlasAxisQA());
 const boxes=await Promise.all(['#playMotion','#resetPose'].map(id=>page.locator(id).boundingBox()));expect(boxes[0].x+boxes[0].width).toBeLessThanOrEqual(boxes[1].x);expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThan(2);
 await page.locator('[data-motion="rot"]').click();expect((await page.evaluate(()=>window.atlasAxisQA())).visible).toBeTruthy();
 await page.locator('[data-motion="stress"]').click();expect((await page.evaluate(()=>window.atlasAxisQA())).visible).toBeTruthy();
 await page.locator('#axisVisibility').click();expect((await page.evaluate(()=>window.atlasAxisQA())).visible).toBeFalsy();await page.locator('#axisVisibility').click();
 await page.screenshot({path:'test-results/knee-review-entry.png'});
});

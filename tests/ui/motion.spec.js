import {test,expect} from '@playwright/test';
import path from 'node:path';
import {writeFileSync} from 'node:fs';

test('Knee motion directions, saved angles, mode continuity and compact panel',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({path:path.resolve('node_modules/three',r.request().url().split('three@0.160.0/')[1])}));
 await page.goto('http://127.0.0.1:8080/?localModels&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const snap=()=>page.evaluate(()=>window.atlasQA());
 await page.locator('[data-focus="knee"]').click();await page.locator('[data-mode="kinesiology"]').click();
 await expect.poll(async()=>Math.abs((await snap()).hip[0])).toBeGreaterThan(.706);
 const initial=await snap();writeFileSync('test-results/joint-calibration.json',JSON.stringify(initial.calibration,null,2));writeFileSync('test-results/joint-landmark-review.json',JSON.stringify(initial.landmarkReview,null,2));
 expect(initial.followers.length).toBeGreaterThanOrEqual(28);
 await expect.poll(async()=>Math.max(...(await snap()).followers.filter(m=>m.name==='Rectus femoris muscle.r').map(m=>m.maxDisplacement))).toBeGreaterThan(.1);
 const input=async value=>{await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));};
 await input(65);await expect(page.locator('#angleReadout')).toHaveText('65°');
 await page.locator('[data-motion="rot"]').click();await input(20);await expect(page.locator('#angleReadout')).toContainText('External 20°');
 await page.locator('[data-motion="flex"]').click();await expect(page.locator('#motionSlider')).toHaveValue('65');
 await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-mode="kinesiology"]').click();await expect(page.locator('#motionSlider')).toHaveValue('65');
 await page.locator('[data-motion="stress"]').click();await input(3);await expect(page.locator('#angleReadout')).toContainText('Valgus 3°');
 await expect.poll(async()=>(await snap()).knee[2]).toBeLessThan(0);
 await input(-3);await expect(page.locator('#angleReadout')).toContainText('Varus 3°');await expect.poll(async()=>(await snap()).knee[2]).toBeGreaterThan(0);
 await page.locator('#resetPose').click();await expect(page.locator('#motionSlider')).toHaveValue('0');
 await page.locator('[data-motion="flex"]').click();await page.locator('#resetPose').click();await expect(page.locator('#motionSlider')).toHaveValue('90');
 const end=await snap();expect(end.bones.every(b=>b.visible)).toBeTruthy();expect(end.states).toEqual(initial.states);
 await page.setViewportSize({width:1280,height:800});
 await page.screenshot({path:'test-results/knee-motion-compact.png'});
 await page.locator('[data-mode="anatomy"]').click();
 await expect.poll(async()=>Math.max(...(await snap()).followers.filter(m=>m.visible).map(m=>m.maxDisplacement))).toBe(0);
 await page.locator('[data-mode="kinesiology"]').click();await expect.poll(async()=>Math.abs((await snap()).hip[0])).toBeGreaterThan(.706);
 const panel=await page.locator('#sidebar').evaluate(el=>({overflow:el.scrollHeight-el.clientHeight,sections:[...el.children].map(c=>({label:c.textContent.slice(0,35),height:c.getBoundingClientRect().height}))}));
 writeFileSync('test-results/panel-metrics.json',JSON.stringify(panel,null,2));expect(panel.overflow).toBeLessThanOrEqual(1);
 // Review artifacts only: show the existing center candidate at viewport center.
 // These crosshairs are injected by the test, never added to the product UI.
 await page.setViewportSize({width:1440,height:1000});await page.locator('[data-mode="anatomy"]').click();await page.locator('[data-focus="knee"]').click();
 await page.locator('[data-tissue]').evaluateAll(rows=>{for(const row of rows){if(row.hidden||row.disabled)continue;while(row.dataset.state!=='off')row.click();}});
 const marker=await page.addStyleTag({content:'.viewport::after{content:"";position:absolute;left:calc(50% - 10px);top:calc(50% - 10px);width:20px;height:20px;border:1px solid #ff7474;border-radius:50%;pointer-events:none}'});
 for(const view of ['front','lateral']){await page.locator(`[data-view="${view}"]`).click();await page.screenshot({path:`test-results/knee-center-${view}.png`});
 const s=await snap();if(s.landmarkNDC){await page.locator('#viewport').evaluate((el,p)=>{const m=document.createElement('div');m.id='reviewCandidate';m.style.cssText='position:absolute;pointer-events:none;width:14px;height:14px;border:2px solid #65caff;left:calc('+((p[0]+1)*50)+'% - 7px);top:calc('+((1-p[1])*50)+'% - 7px)';el.append(m);},s.landmarkNDC);await page.screenshot({path:`test-results/knee-candidate-${view}.png`});await page.locator('#reviewCandidate').evaluate(el=>el.remove());}}
 await page.locator('[data-mode="kinesiology"]').click();await expect.poll(async()=>Math.abs((await snap()).hip[0])).toBeGreaterThan(.706);
 await page.screenshot({path:'test-results/knee-flexion90-review.png'});
 await page.locator('[data-motion="stress"]').click();await input(3);await expect.poll(async()=>(await snap()).knee[2]).toBeLessThan(0);
 await page.screenshot({path:'test-results/knee-valgus30-review.png'});await marker.evaluate(el=>el.remove());
 expect(errors).toEqual([]);
});

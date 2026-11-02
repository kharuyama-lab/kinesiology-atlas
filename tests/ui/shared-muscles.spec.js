import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
test('shared Hip and Knee muscles, restored Hip motions, continuity and compact UI',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8080/?review=muscles&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:90000});
 const snap=()=>page.evaluate(()=>window.atlasQA());
 const initial=await snap();expect(initial.focus).toBe('knee');expect(initial.tissueMeshes.filter(t=>t.name.includes('Vastus')).every(t=>t.count>0&&t.visible)).toBeTruthy();
 await page.locator('[data-tissue="Rectus femoris muscle.r"]').click();const canvas=await page.locator('canvas').elementHandle();
 await page.locator('[data-focus="hip"]').click();await expect(page.locator('#muscleList')).toBeVisible();await expect(page.locator('#motionSection')).toBeVisible();
 let hip=await snap();expect(hip.registered).toEqual(initial.registered);expect(hip.tissueMeshes.find(t=>t.name==='Rectus femoris muscle.r').meshIds).toEqual(initial.tissueMeshes.find(t=>t.name==='Rectus femoris muscle.r').meshIds);for(const name of ['Tensor fasciae latae.r','(Adductor minimus).r','Iliotibial tract.r'])expect(hip.tissueMeshes.find(t=>t.name===name).count).toBeGreaterThan(0);
 for(const [kind,min,max,val] of [['flex','-20','110',80],['abd','-25','45',30],['rot','-45','45',30]]){
 await page.locator(`[data-motion="${kind}"]`).click();await expect(page.locator('#motionSlider')).toHaveAttribute('min',min);await expect(page.locator('#motionSlider')).toHaveAttribute('max',max);
 await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},val);
 await expect.poll(async()=>Math.abs((await snap()).hip[kind==='flex'?0:kind==='abd'?2:1])).toBeGreaterThan(.15);
 }
 const before=await snap();await page.locator('[data-mode="anatomy"]').click();await expect.poll(async()=>Math.abs((await snap()).hip[1])).toBeLessThan(.001);expect((await snap()).states).toEqual(before.states);expect((await snap()).camera).toEqual(before.camera);
 await page.locator('[data-mode="kinesiology"]').click();await expect.poll(async()=>Math.abs((await snap()).hip[1])).toBeGreaterThan(.15);expect((await snap()).motionValue).toBe(30);
 await page.locator('#playMotion').click();await expect.poll(async()=>(await snap()).motionValue).not.toBe(30);await page.locator('#playMotion').click();
 await page.locator('#resetPose').click();expect((await snap()).motionValue).toBe(0);expect(await canvas.evaluate(n=>n===document.querySelector('canvas'))).toBeTruthy();
 await page.setViewportSize({width:1280,height:800});mkdirSync('docs/screenshots/shared-muscles',{recursive:true});await page.screenshot({path:'docs/screenshots/shared-muscles/hip.png'});
 expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 await page.locator('[data-focus="knee"]').click();await page.locator('[data-motion="flex"]').click();await expect.poll(async()=> (await snap()).followers.find(f=>f.name==='Rectus femoris muscle.r').maxDisplacement).toBeGreaterThan(.01);
 await page.screenshot({path:'docs/screenshots/shared-muscles/knee.png'});
 await page.goto('http://127.0.0.1:8080/?review=ligaments&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');await expect(page.locator('#muscleList')).toBeHidden();await page.locator('[data-focus="hip"]').click();await expect(page.locator('#muscleList')).toBeVisible();await expect(page.locator('#motionSection')).toBeVisible();expect((await snap()).tissueMeshes.find(t=>t.name==='Gluteus maximus muscle.r').visible).toBeTruthy();
 expect(errors).toEqual([]);
});

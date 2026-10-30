import {test,expect} from '@playwright/test';
import path from 'node:path';

test('Whole Body has only three bulk controls; knee contains no unrelated ligaments',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({path:path.resolve('node_modules/three',r.request().url().split('three@0.160.0/')[1])}));
 await page.goto('http://127.0.0.1:8080/?localModels&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const snap=()=>page.evaluate(()=>window.atlasQA());const initial=await snap();
 await expect(page.locator('[data-bulk]')).toHaveCount(3);await expect(page.locator('#muscleList')).toBeHidden();await expect(page.locator('#ligamentList')).toBeHidden();
 await expect(page.locator('[data-body-details][open]')).toHaveCount(0);
 const detail=page.locator('[data-body-details="muscle"]');await detail.locator('summary').click();
 const rectus=page.locator('[data-body-tissue="Rectus femoris muscle.r"]');await expect(rectus).toBeVisible();await rectus.click();
 await expect(page.locator('[data-bulk="muscle"] small')).toHaveText('Mixed');expect((await snap()).tissueMeshes.find(m=>m.name==='Rectus femoris muscle.r').opacity).toBe(.3);
 await page.locator('[data-mode="kinesiology"]').click();await expect(detail).toHaveAttribute('open','');await expect(rectus).toHaveAttribute('data-state','fade');await page.locator('[data-mode="anatomy"]').click();
 await page.locator('[data-bulk="muscle"]').click();await expect(page.locator('[data-bulk="muscle"] small')).toHaveText('ON');await expect(rectus).toHaveAttribute('data-state','on');
 await page.screenshot({path:'test-results/whole-body-accordion.png'});await detail.locator('summary').click();
 const canvas=await page.locator('canvas').boundingBox();let picked=false;
 for(const y of [.5,.6,.7]){if(picked)break;for(const x of [.5,.47,.53]){await page.mouse.click(canvas.x+canvas.width*x,canvas.y+canvas.height*y);if(await page.locator('#floatingSelection button').isVisible()){picked=true;break;}}}
 expect(picked).toBeTruthy();await expect(page.locator('#floatingSelection button')).toHaveText('All · ON');await page.locator('#floatingSelection button').click();
 const floating=await snap();const changed=Object.keys(floating.bulkStates).filter(g=>floating.bulkStates[g]!==initial.bulkStates[g]);expect(changed).toHaveLength(1);expect(floating.bulkStates[changed[0]]).toBe('fade');
 expect([...floating.bones,...floating.tissueMeshes].filter(m=>m.group===changed[0]).every(m=>m.opacity===.3)).toBeTruthy();
 await page.locator('[data-focus="body"]').click();
 for(const group of ['bone','connective','muscle']){
  for(const state of ['fade','off','on']){
   await page.locator(`[data-bulk="${group}"]`).click();await expect(page.locator(`[data-bulk="${group}"]`)).toHaveAttribute('data-state',state);
   const s=await snap(),members=[...s.bones,...s.tissueMeshes].filter(m=>m.group===group);expect(members.length).toBeGreaterThan(0);
   expect(s.registered.length).toBe(initial.registered.length);expect(members.every(m=>m.visible===(state!=='off'))).toBeTruthy();
   if(state==='fade')expect(members.every(m=>m.opacity===.3)).toBeTruthy();
  }
 }
 await page.screenshot({path:'test-results/whole-body-bulk.png'});
 for(const group of ['bone','connective','muscle']){await page.locator(`[data-bulk="${group}"]`).click();await page.locator(`[data-bulk="${group}"]`).click();}
 const hidden=await snap();expect([...hidden.bones,...hidden.tissueMeshes].every(m=>!m.visible)).toBeTruthy();
 await page.locator('[data-mode="kinesiology"]').click();const mode=await snap();expect(mode.bulkStates).toEqual(hidden.bulkStates);expect(mode.camera).toEqual(hidden.camera);
 await page.locator('[data-focus="knee"]').click();const knee=await snap();expect(knee.bones.every(m=>m.visible)).toBeTruthy();
 await expect(page.locator('#bodyDisplay')).toBeHidden();await expect(page.locator('#ligamentList')).toBeVisible();
 for(const name of ['Descending part of iliofemoral ligament.r','Transverse part of iliofemoral ligament.r','Pubofemoral ligament.r','Ischiofemoral ligament.r']){
  await expect(page.locator(`[data-tissue="${name}"]`)).toBeHidden();expect(knee.tissueMeshes.find(m=>m.name===name).visible).toBeFalsy();
 }
 await page.screenshot({path:'test-results/knee-only-ligaments.png'});
 await page.locator('[data-mode="anatomy"]').click();const anatomy=await snap();expect(anatomy.states).toEqual(knee.states);
 await page.locator('[data-focus="body"]').click();expect((await snap()).bulkStates).toEqual({bone:'on',connective:'on',muscle:'on'});
 expect(errors).toEqual([]);
});

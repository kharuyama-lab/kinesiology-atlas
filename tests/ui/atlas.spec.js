import {test,expect} from '@playwright/test';
import path from 'node:path';
import {writeFileSync} from 'node:fs';
test('actual GLBs: Anatomy focus, display cycle, mode continuity and home',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://cdn.jsdelivr.net/npm/three@0.160.0/**',r=>r.fulfill({path:path.resolve('node_modules/three',r.request().url().split('three@0.160.0/')[1])}));
 await page.goto('http://127.0.0.1:8080/?localModels&qa');
 await expect(page.locator('#modelStatus')).toHaveText('Ready',{timeout:90000});
 const snap=()=>page.evaluate(()=>window.atlasQA());
 const initial=await snap();expect(initial.bones.length).toBeGreaterThan(150);expect(initial.bones.every(b=>b.visible)).toBeTruthy();
 expect(initial.tissueMeshes.every(t=>t.count>0&&t.visible)).toBeTruthy();
 const muscles=initial.tissueMeshes.filter(t=>t.name.includes('Vastus')||t.name.includes('Gluteus')||t.name.includes('Rectus femoris'));
 expect(new Set(muscles.map(t=>t.color)).size).toBe(muscles.length);
 await expect(page.locator('#muscleList')).toBeHidden();await expect(page.locator('#ligamentList')).toBeHidden();await expect(page.locator('[data-bulk]')).toHaveCount(3);
 expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 expect(await page.locator('#sidebar').textContent()).not.toContain('30%');
 writeFileSync('test-results/model-summary.json',JSON.stringify({bones:initial.bones.length,registered:initial.registered.length},null,2));
 for(const f of ['hip','knee']){await page.locator(`[data-focus="${f}"]`).click();const s=await snap();expect(s.focus).toBe(f);expect(s.bones.length).toBe(initial.bones.length);expect(s.bones.every(b=>b.visible)).toBeTruthy();expect(Math.abs(s.focusNDC[0])).toBeLessThan(.001);expect(Math.abs(s.focusNDC[1])).toBeLessThan(.001);}
 expect(await page.locator('#muscleList').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2);
 const quad=page.locator('[data-tissue="Vastus medialis muscle.r"]');await expect(quad).toBeEnabled();
 await expect(quad.locator('span')).toHaveText('内側広筋');
 for(const state of ['fade','off','on']){await quad.click();await expect(quad).toHaveAttribute('data-state',state);}
 await quad.click();await page.locator('[data-view="medial"]').click();
 await expect.poll(async()=> (await snap()).bones.some(b=>b.name.endsWith('.l')&&b.opacity===.3)).toBeTruthy();
 await page.locator('[data-view="lateral"]').click();
 await expect.poll(async()=> (await snap()).bones.find(b=>b.name==='Femur.l').opacity).toBe(1);
 const before=await snap();const canvas=await page.locator('canvas').elementHandle();
 await page.locator('[data-mode="kinesiology"]').click();
 await expect(page.locator('#motionSection')).toBeVisible();
 await expect.poll(async()=>Math.abs((await snap()).hip[0])).toBeGreaterThan(.65);
 const after=await snap();expect(after.focus).toBe('knee');for(let i=0;i<3;i++)expect(after.camera[i]-after.target[i]).toBeCloseTo(before.camera[i]-before.target[i],6);expect(after.states).toEqual(before.states);expect(await canvas.evaluate(n=>n===document.querySelector('canvas'))).toBeTruthy();
 await page.locator('[data-motion="stress"]').click();await expect(page.locator('#motionSlider')).toHaveAttribute('max','3');
 await page.locator('#axisToggle').check();
 await page.screenshot({path:'test-results/knee-mode2.png'});
 await page.locator('[data-mode="anatomy"]').click();await expect.poll(async()=>Math.abs((await snap()).hip[0])).toBeLessThan(.001);expect(await page.locator('#axisToggle').isChecked()).toBeTruthy();
 await page.screenshot({path:'test-results/knee-anatomy.png'});
 // Raycast the actual canvas to select a tissue and operate the floating control.
 await page.locator('[data-view="front"]').click();
 const box=await page.locator('canvas').boundingBox();let picked=false,clickPoint;
 for(let dy=-.12;dy<=.12&&!picked;dy+=.06)for(let dx=-.12;dx<=.12&&!picked;dx+=.06){clickPoint={x:box.x+box.width*(.5+dx),y:box.y+box.height*(.5+dy)};await page.mouse.move(clickPoint.x,clickPoint.y);await page.mouse.click(clickPoint.x,clickPoint.y);picked=await page.locator('#floatingSelection button').isVisible();}
 expect(picked).toBeTruthy();const title=await page.locator('#floatingSelection .selectedName').textContent();
 const old=await page.locator('#floatingSelection button').textContent();const next=({'ON':'Fade','Fade':'OFF','OFF':'ON'})[old];
 await page.locator('#floatingSelection button').click();await expect(page.locator('#selectedStructure button')).toHaveText(next);await expect(page.locator('#floatingSelection .selectedName')).toHaveText(title);
 const popup=await page.locator('#floatingSelection').boundingBox();expect(Math.abs(popup.x-clickPoint.x)).toBeLessThan(300);expect(Math.abs(popup.y-clickPoint.y)).toBeLessThan(160);
 await expect(page.locator('#floatingSelection .selectedEnglish')).not.toHaveText('');
 await page.screenshot({path:'test-results/selection-near-muscle.png'});
 await page.locator('[data-focus="body"]').click();const home=await snap();expect(home.focus).toBe('body');expect(home.states['Vastus medialis muscle.r']).toBe('on');expect(home.camera).toEqual(initial.camera);expect(home.target).toEqual(initial.target);expect(home.bones.every(b=>b.visible)).toBeTruthy();
 await page.screenshot({path:'test-results/whole-body.png'});
 for(const f of ['body','hip']){await page.locator(`[data-focus="${f}"]`).click();const a=await snap();await page.locator('[data-mode="kinesiology"]').click();const b=await snap();expect(b.focus).toBe(f);expect(b.states).toEqual(a.states);expect(b.camera).toEqual(a.camera);await page.locator('[data-mode="anatomy"]').click();}
 await page.locator('[data-focus="hip"]').click();await page.screenshot({path:'test-results/hip-anatomy.png'});
 // Reloading a manual source from a bent pose must not duplicate or corrupt the rig.
 await page.locator('[data-focus="knee"]').click();await page.locator('[data-mode="kinesiology"]').click();
 await page.locator('#manualFiles').setInputFiles('.cache/muscular.glb');await expect.poll(async()=>(await snap()).focus).toBe('body');
 expect((await snap()).registered.length).toBe(initial.registered.length);await page.locator('[data-mode="anatomy"]').click();
 await page.setViewportSize({width:390,height:844});await page.locator('#mobilePanel').click();await page.screenshot({path:'test-results/mobile.png'});
 expect(errors).toEqual([]);
});

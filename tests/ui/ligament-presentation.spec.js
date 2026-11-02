import {test,expect} from '@playwright/test';
test('rotation cues, maximum glow and bone display retain user visibility',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=ligaments&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 await page.locator('[data-motion="rot"]').click();
 const set=async angle=>{await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(angle));await expect.poll(async()=>Math.abs((await page.evaluate(()=>window.atlasQA())).renderedAngles.rot-angle)).toBeLessThan(.001);};
 await page.locator('#boneVisibility').click();
 expect((await page.evaluate(()=>window.atlasQA())).bones.every(b=>b.visible&&b.opacity===.3)).toBeTruthy();
 await set(-15);const ir=await page.evaluate(()=>window.atlasPresentationQA());
 const acl='Anterior cruciate ligament.r',pcl='Posterior cruciate ligament.r',mcl='Superficial part of tibial collateral ligament.r',lcl='Fibular collateral ligament.r';
 for(const name of [acl,pcl]){expect(ir.materials[name].opacity).toBeGreaterThan(.98);expect(ir.materials[name].glow).toBeGreaterThan(.5);}
 expect(ir.materials[mcl].opacity).toBeLessThan(.3);await page.screenshot({path:'test-results/ligament-ir.png'});
 await set(30);const er=await page.evaluate(()=>window.atlasPresentationQA());for(const name of [mcl,lcl]){expect(er.materials[name].opacity).toBeGreaterThan(.98);expect(er.materials[name].glow).toBeGreaterThan(.5);}expect(er.materials[acl].opacity).toBeLessThan(.3);await page.screenshot({path:'test-results/ligament-er.png'});
 await page.locator('[data-tissue="'+mcl+'"]').click();expect((await page.evaluate(()=>window.atlasPresentationQA())).materials[mcl].opacity).toBe(.3);await page.locator('[data-tissue="'+mcl+'"]').click();expect((await page.evaluate(()=>window.atlasPresentationQA())).materials[mcl].visible).toBeFalsy();
 await page.locator('#boneVisibility').click();expect((await page.evaluate(()=>window.atlasQA())).bones.every(b=>!b.visible)).toBeTruthy();
 await page.locator('[data-mode="anatomy"]').click();expect((await page.evaluate(()=>window.atlasPresentationQA())).boneState).toBe('off');await page.locator('[data-mode="kinesiology"]').click();expect((await page.evaluate(()=>window.atlasPresentationQA())).boneState).toBe('off');
 await page.locator('#boneVisibility').click();expect((await page.evaluate(()=>window.atlasQA())).bones.every(b=>b.visible)).toBeTruthy();
 await page.setViewportSize({width:1280,height:800});expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
 await page.locator('[data-focus="body"]').click();expect((await page.evaluate(()=>window.atlasPresentationQA())).boneState).toBe('on');
});

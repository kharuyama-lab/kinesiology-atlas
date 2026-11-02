import {test,expect} from '@playwright/test';
test('original follower with extension and internal rotation cues and explicit visibility',async({page})=>{
 await page.goto('http://127.0.0.1:8080/?review=ligaments&axis=condyle&qa');await expect(page.locator('#modelStatus')).toHaveText('Ready');
 const set=async(kind,value)=>{await page.locator('[data-motion="'+kind+'"]').click();await page.locator('#motionSlider').evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},String(value));await expect.poll(async()=>Math.abs((await page.evaluate(()=>window.atlasQA())).renderedAngles[kind==='flex'?'flex':'rot']-value)).toBeLessThan(.001);};
 await page.locator('#boneVisibility').click();expect((await page.evaluate(()=>window.atlasQA())).bones.every(b=>b.visible&&b.opacity===.3)).toBeTruthy();
 await set('flex',0);const ext=await page.evaluate(()=>window.atlasPresentationQA());for(const name of ['Anterior cruciate ligament.r','Fibular collateral ligament.r','Superficial part of tibial collateral ligament.r']){expect(ext.materials[name].opacity).toBe(1);expect(ext.materials[name].glow).toBeGreaterThan(.5);}
 await page.screenshot({path:'test-results/restored-extension.png'});
 await set('rot',-15);const ir=await page.evaluate(()=>window.atlasPresentationQA());for(const name of ['Anterior cruciate ligament.r','Posterior cruciate ligament.r'])expect(ir.materials[name].glow).toBeGreaterThan(.5);
 for(const value of [30]){await set('rot',value);const s=await page.evaluate(()=>window.atlasPresentationQA());expect(Object.values(s.materials).every(m=>m.opacity===1&&m.glow<.001)).toBeTruthy();}
 await page.screenshot({path:'test-results/restored-ligaments.png'});
 const row=page.locator('[data-tissue="Fibular collateral ligament.r"]');await row.click();await expect.poll(async()=>(await page.evaluate(()=>window.atlasPresentationQA())).materials['Fibular collateral ligament.r'].opacity).toBe(.3);await row.click();expect((await page.evaluate(()=>window.atlasPresentationQA())).materials['Fibular collateral ligament.r'].visible).toBeFalsy();
 await page.locator('[data-mode="anatomy"]').click();await expect(row).toHaveAttribute('data-state','off');await page.locator('[data-mode="kinesiology"]').click();await expect(row).toHaveAttribute('data-state','off');
 await page.setViewportSize({width:1280,height:800});expect(await page.locator('#sidebar').evaluate(el=>el.scrollHeight-el.clientHeight)).toBeLessThanOrEqual(1);
});
